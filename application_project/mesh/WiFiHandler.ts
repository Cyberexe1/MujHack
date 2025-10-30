import { MeshPeer, MeshMessage, ConnectionInfo } from './types';

// Mock Wi-Fi P2P implementation for Expo development
// In production with bare React Native, replace with actual react-native-wifi-p2p
const MockWifiP2P = {
  initialize: async () => Promise.resolve(),
  discoverPeers: async () => Promise.resolve(),
  connect: async (deviceAddress: string) => Promise.resolve(),
  disconnect: async () => Promise.resolve(),
};

/**
 * WiFiHandler - Manages Wi-Fi Direct P2P communication
 */
export class WiFiHandler {
  private isInitialized = false;
  private isDiscovering = false;
  private discoveredPeers = new Map<string, MeshPeer>();
  private connections = new Map<string, ConnectionInfo>();
  private messageCallback?: (message: MeshMessage) => void;
  private peerCallback?: (peers: MeshPeer[]) => void;
  private server?: any;
  private readonly port = 8888;

  constructor() {
    // In production, setup native event listeners here
  }

  /**
   * Initialize Wi-Fi Direct module
   */
  async initialize(): Promise<boolean> {
    try {
      // Mock initialization - in production, initialize Wi-Fi P2P
      console.log('WiFi Direct initialized (mock)');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Wi-Fi Direct:', error);
      return false;
    }
  }

  /**
   * Start discovering Wi-Fi Direct peers
   */
  async startDiscovery(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Wi-Fi Direct not initialized');
    }

    if (this.isDiscovering) {
      return;
    }

    try {
      this.isDiscovering = true;
      
      // Mock discovery - in production, use WifiP2P.discoverPeers()
      console.log('Started Wi-Fi Direct discovery (mock)');
      
      // Simulate discovering a peer after 2 seconds
      setTimeout(() => {
        this.simulateDiscoveredPeer();
      }, 2000);

    } catch (error) {
      console.error('Failed to start Wi-Fi Direct discovery:', error);
      this.isDiscovering = false;
    }
  }

  /**
   * Stop discovery
   */
  async stopDiscovery(): Promise<void> {
    if (this.isDiscovering) {
      this.isDiscovering = false;
      console.log('Stopped Wi-Fi Direct discovery');
    }
  }

  /**
   * Connect to a discovered peer
   */
  async connectToPeer(peerId: string): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    if (!peer) {
      console.error('Wi-Fi peer not found:', peerId);
      return false;
    }

    try {
      peer.status = 'connecting';
      this.notifyPeerUpdate();

      // Mock connection - in production, use WifiP2P.connect()
      await this.delay(1000);

      const connection: ConnectionInfo = {
        id: peerId,
        type: 'wifi',
        lastActivity: Date.now(),
      };

      this.connections.set(peerId, connection);
      peer.status = 'connected';
      this.notifyPeerUpdate();

      // Start TCP server for this connection (mock)
      this.startTcpServer();

      console.log('Connected to Wi-Fi Direct peer:', peerId);
      return true;
    } catch (error) {
      console.error('Failed to connect to Wi-Fi Direct peer:', error);
      peer.status = 'disconnected';
      this.notifyPeerUpdate();
      return false;
    }
  }

  /**
   * Send message to a connected peer
   */
  async sendMessage(peerId: string, message: MeshMessage): Promise<boolean> {
    const connection = this.connections.get(peerId);
    if (!connection) {
      console.error('No Wi-Fi connection to peer:', peerId);
      return false;
    }

    try {
      // Mock sending - in production, send via TCP socket
      const data = JSON.stringify(message);
      console.log('Sent Wi-Fi Direct message to:', peerId, data.length, 'bytes');
      
      connection.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error('Failed to send Wi-Fi Direct message:', error);
      return false;
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcastMessage(message: MeshMessage): Promise<number> {
    let successCount = 0;
    const promises = Array.from(this.connections.keys()).map(async (peerId) => {
      const success = await this.sendMessage(peerId, message);
      if (success) successCount++;
    });

    await Promise.all(promises);
    return successCount;
  }

  /**
   * Disconnect from a peer
   */
  async disconnectPeer(peerId: string): Promise<void> {
    try {
      // Mock disconnection - in production, close TCP connection and Wi-Fi P2P
      this.connections.delete(peerId);
      
      const peer = this.discoveredPeers.get(peerId);
      if (peer) {
        peer.status = 'disconnected';
        this.notifyPeerUpdate();
      }

      console.log('Disconnected from Wi-Fi Direct peer:', peerId);
    } catch (error) {
      console.error('Failed to disconnect from Wi-Fi Direct peer:', error);
    }
  }

  /**
   * Get list of discovered peers
   */
  getDiscoveredPeers(): MeshPeer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): MeshPeer[] {
    return this.getDiscoveredPeers().filter(peer => peer.status === 'connected');
  }

  /**
   * Set callback for incoming messages
   */
  setMessageCallback(callback: (message: MeshMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Set callback for peer updates
   */
  setPeerCallback(callback: (peers: MeshPeer[]) => void): void {
    this.peerCallback = callback;
  }

  /**
   * Start TCP server for incoming connections (mock)
   */
  private startTcpServer(): void {
    if (this.server) {
      return;
    }

    // Mock TCP server - in production, create actual TCP server
    console.log(`Started TCP server on port ${this.port} (mock)`);
    this.server = { port: this.port };

    // Simulate receiving a message after 3 seconds
    setTimeout(() => {
      this.simulateIncomingMessage();
    }, 3000);
  }

  /**
   * Simulate discovering a peer (for testing)
   */
  private simulateDiscoveredPeer(): void {
    const peer: MeshPeer = {
      id: `wifi-peer-${Date.now()}`,
      name: `WiFi-Device-${Math.floor(Math.random() * 1000)}`,
      address: `192.168.49.${Math.floor(Math.random() * 254) + 1}`,
      type: 'wifi',
      status: 'discovered',
      lastSeen: Date.now(),
    };

    this.discoveredPeers.set(peer.id, peer);
    this.notifyPeerUpdate();
    console.log('Discovered Wi-Fi Direct device:', peer.name);
  }

  /**
   * Simulate incoming message (for testing)
   */
  private simulateIncomingMessage(): void {
    if (!this.messageCallback) {
      return;
    }

    const mockMessage: MeshMessage = {
      id: `msg-${Date.now()}`,
      from: 'wifi-peer-test',
      to: 'all',
      mode: 'BROADCAST',
      timestamp: Date.now(),
      payload: 'Hello from Wi-Fi Direct!',
      ack: false,
    };

    this.messageCallback(mockMessage);
    console.log('Received Wi-Fi Direct message (mock):', mockMessage.id);
  }

  /**
   * Notify peer list update
   */
  private notifyPeerUpdate(): void {
    if (this.peerCallback) {
      this.peerCallback(this.getDiscoveredPeers());
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopDiscovery();
    
    // Disconnect all peers
    const disconnectPromises = Array.from(this.connections.keys()).map(
      peerId => this.disconnectPeer(peerId)
    );
    await Promise.all(disconnectPromises);

    this.discoveredPeers.clear();
    this.connections.clear();
    this.server = undefined;
  }
}