import { MessageEnvelope, KeyEnvelope } from '../types/message';
import { MessageStore } from './messageStore';
import { MessageFactory } from './messageFactory';
import { NodeIdGenerator } from '../utils/nodeId';

export type MessageHandler = (message: MessageEnvelope) => void;
export type KeyHandler = (key: KeyEnvelope) => void;
export type PeerDiscoveredHandler = (peerId: string) => void;
export type PeerLostHandler = (peerId: string) => void;

export class MeshNetwork {
  private peers: Set<string> = new Set();
  private messageHandlers: MessageHandler[] = [];
  private keyHandlers: KeyHandler[] = [];
  private peerDiscoveredHandlers: PeerDiscoveredHandler[] = [];
  private peerLostHandlers: PeerLostHandler[] = [];
  private nodeId: string;
  private serverUrl: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private static instance: MeshNetwork;

  private constructor(serverUrl: string = 'ws://localhost:3000/mesh') {
    this.nodeId = NodeIdGenerator.getOrCreateNodeId();
    this.serverUrl = serverUrl;
  }

  static getInstance(serverUrl?: string): MeshNetwork {
    if (!this.instance) {
      this.instance = new MeshNetwork(serverUrl);
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    // Update server URL from Electron if available
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const electronUrl = await window.electronAPI.getServerUrl();
        if (electronUrl) {
          this.serverUrl = electronUrl;
        }
      } catch (error) {
        // Not in Electron or API not available, use default
        console.log('Running in Electron, using embedded server');
      }
    }
    await this.connectToServer();
  }

  private async connectToServer(): Promise<void> {
    try {
      const ws = new WebSocket(this.serverUrl);

      ws.onopen = () => {
        console.log('Connected to mesh server');
        this.reconnectAttempts = 0;
        
        // Register this node with the server
        ws.send(
          JSON.stringify({
            type: 'register',
            peerId: this.nodeId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString());

          if (message.type === 'peer_list') {
            // Handle peer list from server
            message.peers?.forEach((peerId: string) => {
              if (!this.peers.has(peerId)) {
                this.peers.add(peerId);
                this.peerDiscoveredHandlers.forEach((handler) => handler(peerId));
              }
            });
          } else if (message.type === 'peer_connected') {
            // New peer connected
            if (!this.peers.has(message.peerId)) {
              this.peers.add(message.peerId);
              this.peerDiscoveredHandlers.forEach((handler) => handler(message.peerId));
            }
          } else if (message.type === 'peer_disconnected') {
            // Peer disconnected
            if (this.peers.has(message.peerId)) {
              this.peers.delete(message.peerId);
              this.peerLostHandlers.forEach((handler) => handler(message.peerId));
            }
          } else if (message.type === 'mesh_message') {
            // Handle mesh message from server
            if (message.envelopeType === 'key') {
              this.handleKeyEnvelope(message.envelope);
            } else {
              this.handleMessageEnvelope(message.envelope);
            }
          }
        } catch (error) {
          console.error('Failed to parse server message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Disconnected from mesh server');
        this.peers.clear();
        this.peerLostHandlers.forEach((handler) => {
          Array.from(this.peers).forEach((peerId) => handler(peerId));
        });
        this.peers.clear();

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connectToServer();
          }, this.reconnectDelay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      this.ws = ws;
    } catch (error) {
      console.error('Failed to connect to mesh server:', error);
      
      // Retry connection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          this.connectToServer();
        }, this.reconnectDelay);
      }
    }
  }


  private handleMessageEnvelope(message: MessageEnvelope): void {
    if (MessageStore.isDuplicate(message.msg_id)) {
      return;
    }

    MessageStore.markAsProcessed(message.msg_id);
    MessageStore.saveMessageEnvelope(message);

    this.messageHandlers.forEach((handler) => handler(message));

    if (message.ttl > 0) {
      this.forwardMessageEnvelope(message);
    }
  }

  private handleKeyEnvelope(key: KeyEnvelope): void {
    if (MessageStore.isDuplicate(key.msg_id)) {
      return;
    }

    MessageStore.markAsProcessed(key.msg_id);
    MessageStore.saveKeyEnvelope(key);

    this.keyHandlers.forEach((handler) => handler(key));

    // Don't forward key envelopes - they're sent directly by the sender
    // Only the message envelopes are forwarded through the mesh
  }

  private forwardMessageEnvelope(message: MessageEnvelope): void {
    const forwarded = MessageFactory.addHop(message);
    this.sendToServer('mesh_message', { envelope: forwarded });
  }

  broadcastMessage(message: MessageEnvelope): void {
    MessageStore.saveMessageEnvelope(message);
    this.messageHandlers.forEach((handler) => handler(message));
    this.sendToServer('mesh_message', { envelope: message });
  }

  broadcastKeyEnvelope(key: KeyEnvelope): void {
    MessageStore.saveKeyEnvelope(key);
    this.keyHandlers.forEach((handler) => handler(key));
    this.sendToServer('mesh_message', { envelope: key, envelopeType: 'key' });
  }

  private sendToServer(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onKeyEnvelope(handler: KeyHandler): void {
    this.keyHandlers.push(handler);
  }

  onPeerDiscovered(handler: PeerDiscoveredHandler): void {
    this.peerDiscoveredHandlers.push(handler);
  }

  onPeerLost(handler: PeerLostHandler): void {
    this.peerLostHandlers.push(handler);
  }

  getPeers(): string[] {
    return Array.from(this.peers.keys());
  }

  getNodeId(): string {
    return this.nodeId;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.peers.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
