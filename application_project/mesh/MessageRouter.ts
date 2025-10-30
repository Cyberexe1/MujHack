import { v4 as uuidv4 } from 'uuid';
import { MeshMessage, MeshPeer } from './types';
import { CacheManager } from './CacheManager';
import { BluetoothHandler } from './BluetoothHandler';
import { WiFiHandler } from './WiFiHandler';

/**
 * MessageRouter - Orchestrates message sending, receiving, and mesh propagation
 */
export class MessageRouter {
  private cacheManager = new CacheManager();
  private bluetoothHandler?: BluetoothHandler;
  private wifiHandler?: WiFiHandler;
  private messageCallback?: (message: MeshMessage) => void;
  private deviceId: string;

  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private pendingAcks = new Map<string, any>();

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /**
   * Initialize with communication handlers
   */
  initialize(bluetoothHandler: BluetoothHandler, wifiHandler: WiFiHandler): void {
    this.bluetoothHandler = bluetoothHandler;
    this.wifiHandler = wifiHandler;

    // Set up message callbacks
    this.bluetoothHandler.setMessageCallback((message) => {
      this.handleIncomingMessage(message, 'bluetooth');
    });

    this.wifiHandler.setMessageCallback((message) => {
      this.handleIncomingMessage(message, 'wifi');
    });
  }

  /**
   * Send message with automatic channel selection and retries
   */
  async sendMessage(
    mode: 'BROADCAST' | 'SECURE',
    payload: string,
    targetPeerId?: string
  ): Promise<boolean> {
    const message: MeshMessage = {
      id: uuidv4(),
      from: this.deviceId,
      to: targetPeerId || 'all',
      mode,
      timestamp: Date.now(),
      payload,
      ack: false,
    };

    console.log('Routing message:', message.id, 'mode:', mode);

    // Add to cache to prevent re-broadcasting our own message
    this.cacheManager.addMessage(message.id);

    // Try sending via available channels
    const success = await this.sendViaAvailableChannels(message);

    if (success && mode === 'SECURE' && targetPeerId) {
      // Wait for ACK for secure messages
      this.waitForAck(message.id);
    }

    return success;
  }

  /**
   * Send message via available communication channels
   */
  private async sendViaAvailableChannels(message: MeshMessage): Promise<boolean> {
    let bluetoothSuccess = false;
    let wifiSuccess = false;

    // Try Bluetooth first
    if (this.bluetoothHandler) {
      try {
        if (message.to === 'all') {
          const count = await this.bluetoothHandler.broadcastMessage(message);
          bluetoothSuccess = count > 0;
        } else {
          bluetoothSuccess = await this.bluetoothHandler.sendMessage(message.to, message);
        }
      } catch (error) {
        console.error('Bluetooth send failed:', error);
      }
    }

    // Try Wi-Fi Direct if Bluetooth failed or for redundancy
    if (this.wifiHandler && (!bluetoothSuccess || message.mode === 'BROADCAST')) {
      try {
        if (message.to === 'all') {
          const count = await this.wifiHandler.broadcastMessage(message);
          wifiSuccess = count > 0;
        } else {
          wifiSuccess = await this.wifiHandler.sendMessage(message.to, message);
        }
      } catch (error) {
        console.error('Wi-Fi send failed:', error);
      }
    }

    const success = bluetoothSuccess || wifiSuccess;
    console.log('Message send result:', {
      messageId: message.id,
      bluetooth: bluetoothSuccess,
      wifi: wifiSuccess,
      overall: success,
    });

    return success;
  }

  /**
   * Handle incoming message from any channel
   */
  private handleIncomingMessage(message: MeshMessage, source: 'bluetooth' | 'wifi'): void {
    console.log('Received message:', message.id, 'from:', source);

    // Check for duplicates
    if (this.cacheManager.isDuplicate(message.id)) {
      console.log('Duplicate message ignored:', message.id);
      return;
    }

    // Add to cache
    this.cacheManager.addMessage(message.id);

    // Handle ACK messages
    if (message.ack) {
      this.handleAckMessage(message);
      return;
    }

    // Forward to UI callback
    if (this.messageCallback) {
      this.messageCallback(message);
    }

    // Re-broadcast if it's a broadcast message (mesh propagation)
    if (message.mode === 'BROADCAST' && message.to === 'all') {
      this.rebroadcastMessage(message, source);
    }

    // Send ACK for secure messages
    if (message.mode === 'SECURE' && message.to !== 'all') {
      this.sendAck(message);
    }
  }

  /**
   * Re-broadcast message to propagate through mesh network
   */
  private async rebroadcastMessage(message: MeshMessage, excludeSource: 'bluetooth' | 'wifi'): Promise<void> {
    console.log('Re-broadcasting message:', message.id);

    // Small delay to prevent network congestion
    await this.delay(Math.random() * 500 + 100);

    // Re-broadcast via other channels (not the source)
    if (excludeSource !== 'bluetooth' && this.bluetoothHandler) {
      try {
        await this.bluetoothHandler.broadcastMessage(message);
      } catch (error) {
        console.error('Bluetooth re-broadcast failed:', error);
      }
    }

    if (excludeSource !== 'wifi' && this.wifiHandler) {
      try {
        await this.wifiHandler.broadcastMessage(message);
      } catch (error) {
        console.error('Wi-Fi re-broadcast failed:', error);
      }
    }
  }

  /**
   * Send acknowledgment for received message
   */
  private async sendAck(originalMessage: MeshMessage): Promise<void> {
    const ackMessage: MeshMessage = {
      id: uuidv4(),
      from: this.deviceId,
      to: originalMessage.from,
      mode: originalMessage.mode,
      timestamp: Date.now(),
      payload: `ACK:${originalMessage.id}`,
      ack: true,
    };

    await this.sendViaAvailableChannels(ackMessage);
    console.log('Sent ACK for message:', originalMessage.id);
  }

  /**
   * Handle received ACK message
   */
  private handleAckMessage(ackMessage: MeshMessage): void {
    const originalMessageId = ackMessage.payload.replace('ACK:', '');
    const timeout = this.pendingAcks.get(originalMessageId);

    if (timeout) {
      clearTimeout(timeout);
      this.pendingAcks.delete(originalMessageId);
      console.log('Received ACK for message:', originalMessageId);
    }
  }

  /**
   * Wait for ACK with timeout
   */
  private waitForAck(messageId: string): void {
    const timeout = setTimeout(() => {
      console.log('ACK timeout for message:', messageId);
      this.pendingAcks.delete(messageId);
      // Could implement retry logic here
    }, 10000); // 10 second timeout

    this.pendingAcks.set(messageId, timeout);
  }

  /**
   * Get all discovered peers from both channels
   */
  getAllPeers(): MeshPeer[] {
    const peers: MeshPeer[] = [];

    if (this.bluetoothHandler) {
      peers.push(...this.bluetoothHandler.getDiscoveredPeers());
    }

    if (this.wifiHandler) {
      peers.push(...this.wifiHandler.getDiscoveredPeers());
    }

    // Remove duplicates based on device ID
    const uniquePeers = peers.filter((peer, index, self) =>
      index === self.findIndex(p => p.id === peer.id)
    );

    return uniquePeers;
  }

  /**
   * Get all connected peers from both channels
   */
  getConnectedPeers(): MeshPeer[] {
    return this.getAllPeers().filter(peer => peer.status === 'connected');
  }

  /**
   * Set callback for processed messages
   */
  setMessageCallback(callback: (message: MeshMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      cache: this.cacheManager.getStats(),
      pendingAcks: this.pendingAcks.size,
      totalPeers: this.getAllPeers().length,
      connectedPeers: this.getConnectedPeers().length,
    };
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
  cleanup(): void {
    // Clear pending ACK timeouts
    this.pendingAcks.forEach(timeout => clearTimeout(timeout));
    this.pendingAcks.clear();

    // Clear cache
    this.cacheManager.clear();
  }
}