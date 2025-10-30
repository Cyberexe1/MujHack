import { KeyManager } from './KeyManager';
import { Database } from './Database';
import { MessageEncryptor } from './MessageEncryptor';
import { DeliveryManager } from './DeliveryManager';
import { StoredMessage, EncryptedMessage } from './types';
import { MeshMessage } from '@/mesh/types';

/**
 * BackendManager - Main controller for security, storage, and reliability
 */
export class BackendManager {
  private static instance: BackendManager;
  private keyManager: KeyManager;
  private database: Database;
  private messageEncryptor: MessageEncryptor;
  private deliveryManager: DeliveryManager;
  private initialized = false;

  // Callbacks
  private messageCallback?: (message: StoredMessage) => void;
  private deliveryCallback?: (messageId: string, delivered: boolean) => void;

  private constructor() {
    this.keyManager = KeyManager.getInstance();
    this.database = Database.getInstance();
    this.messageEncryptor = new MessageEncryptor();
    this.deliveryManager = DeliveryManager.getInstance();
  }

  static getInstance(): BackendManager {
    if (!BackendManager.instance) {
      BackendManager.instance = new BackendManager();
    }
    return BackendManager.instance;
  }

  /**
   * Initialize the backend system
   */
  async initialize(deviceId: string, deviceName: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing backend system...');

      // Initialize components in order
      await this.keyManager.initialize();
      await this.database.initialize();

      // Add our own device info to key manager if not exists
      if (!this.keyManager.hasPeerKey(deviceId)) {
        await this.keyManager.addPeerKey(
          deviceId,
          deviceName,
          this.keyManager.getPublicKey()
        );
      }

      this.initialized = true;
      console.log('Backend system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backend system:', error);
      throw error;
    }
  }

  /**
   * Process outgoing message - encrypt and prepare for transmission
   */
  async processOutgoingMessage(
    text: string,
    mode: 'BROADCAST' | 'SECURE',
    fromDeviceId: string,
    toDeviceId?: string
  ): Promise<{ meshMessage: MeshMessage; storedMessage: StoredMessage }> {
    try {
      // Encrypt the message
      const encryptedMessage = await this.messageEncryptor.encryptMessage(
        text,
        mode,
        fromDeviceId,
        toDeviceId
      );

      // Convert to mesh message format
      const meshMessage = this.messageEncryptor.encryptedToMeshMessage(encryptedMessage);

      // Create stored message for local database
      const storedMessage: StoredMessage = {
        id: encryptedMessage.id,
        from: fromDeviceId,
        to: toDeviceId || 'all',
        text,
        timestamp: encryptedMessage.timestamp,
        mode,
        type: 'sent',
        delivered: false,
        read: true, // Sent messages are automatically "read"
      };

      // Save to database
      await this.database.saveMessage(storedMessage);

      // Track for delivery if secure mode
      if (mode === 'SECURE' && toDeviceId) {
        this.deliveryManager.trackMessage(encryptedMessage.id, async (messageId, attempt) => {
          console.log(`Retry attempt ${attempt} for message ${messageId}`);
          // Return false to indicate retry should be handled by mesh layer
          return false;
        });
      }

      console.log('Outgoing message processed:', encryptedMessage.id);
      return { meshMessage, storedMessage };
    } catch (error) {
      console.error('Failed to process outgoing message:', error);
      throw error;
    }
  }

  /**
   * Process incoming message - decrypt and store
   */
  async processIncomingMessage(meshMessage: MeshMessage): Promise<StoredMessage | null> {
    try {
      // Skip ACK messages
      if (this.messageEncryptor.isAckMessage(meshMessage)) {
        const originalMessageId = this.messageEncryptor.getAckMessageId(meshMessage);
        if (originalMessageId) {
          await this.deliveryManager.ackReceived(originalMessageId);
          
          if (this.deliveryCallback) {
            this.deliveryCallback(originalMessageId, true);
          }
        }
        return null;
      }

      // Convert mesh message to encrypted format
      const encryptedMessage = this.messageEncryptor.meshToEncryptedMessage(meshMessage);

      // Decrypt the message
      const decryptedText = await this.messageEncryptor.decryptMessage(encryptedMessage);

      // Create stored message
      const storedMessage: StoredMessage = {
        id: encryptedMessage.id,
        from: encryptedMessage.from,
        to: encryptedMessage.to,
        text: decryptedText,
        timestamp: encryptedMessage.timestamp,
        mode: encryptedMessage.mode,
        type: 'received',
        delivered: true, // Received messages are automatically delivered
        read: false,
      };

      // Save to database
      await this.database.saveMessage(storedMessage);

      // Send ACK for secure messages
      if (encryptedMessage.mode === 'SECURE' && encryptedMessage.to !== 'all') {
        // ACK will be sent by the mesh layer
      }

      // Update peer activity
      await this.keyManager.updatePeerActivity(encryptedMessage.from);

      console.log('Incoming message processed:', encryptedMessage.id);

      // Notify callback
      if (this.messageCallback) {
        this.messageCallback(storedMessage);
      }

      return storedMessage;
    } catch (error) {
      console.error('Failed to process incoming message:', error);
      return null;
    }
  }

  /**
   * Handle key exchange for new peers
   */
  async handleKeyExchange(peerId: string, peerName: string, publicKey: string): Promise<boolean> {
    try {
      await this.keyManager.addPeerKey(peerId, peerName, publicKey);
      
      // Save peer to database
      await this.database.savePeer({
        id: peerId,
        name: peerName,
        publicKey,
        lastActive: Date.now(),
        trusted: false,
      });

      console.log(`Key exchange completed with ${peerName} (${peerId})`);
      return true;
    } catch (error) {
      console.error('Key exchange failed:', error);
      return false;
    }
  }

  /**
   * Get our public key for sharing
   */
  getPublicKey(): string {
    return this.keyManager.getPublicKey();
  }

  /**
   * Get all messages from database
   */
  async getAllMessages(): Promise<StoredMessage[]> {
    return await this.database.getAllMessages();
  }

  /**
   * Get messages between specific devices
   */
  async getMessagesBetween(device1: string, device2: string): Promise<StoredMessage[]> {
    return await this.database.getMessagesBetween(device1, device2);
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.database.markAsRead(messageId);
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    return await this.database.getUnreadCount();
  }

  /**
   * Get all known peers
   */
  async getAllPeers() {
    return await this.database.getAllPeers();
  }

  /**
   * Trust a peer
   */
  async trustPeer(peerId: string): Promise<void> {
    await this.keyManager.trustPeer(peerId);
    
    // Update database
    const peer = this.keyManager.getPeerInfo(peerId);
    if (peer) {
      await this.database.savePeer(peer);
    }
  }

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageId: string) {
    return this.deliveryManager.getDeliveryStatus(messageId);
  }

  /**
   * Retry message delivery
   */
  async retryMessage(messageId: string): Promise<boolean> {
    return await this.deliveryManager.retryMessage(messageId, async (id, attempt) => {
      console.log(`Backend retry for message ${id}, attempt ${attempt}`);
      // Return false to let mesh layer handle the actual retry
      return false;
    });
  }

  /**
   * Set callback for incoming messages
   */
  setMessageCallback(callback: (message: StoredMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Set callback for delivery status updates
   */
  setDeliveryCallback(callback: (messageId: string, delivered: boolean) => void): void {
    this.deliveryCallback = callback;
  }

  /**
   * Get comprehensive backend statistics
   */
  async getStats() {
    const dbStats = await this.database.getStats();
    const keyStats = this.keyManager.getStats();
    const deliveryStats = this.deliveryManager.getStats();
    const encryptionStats = this.messageEncryptor.getStats();

    return {
      initialized: this.initialized,
      database: dbStats,
      keyManager: keyStats,
      delivery: deliveryStats,
      encryption: encryptionStats,
    };
  }

  /**
   * Cleanup old data
   */
  async cleanup(olderThanDays: number = 30): Promise<void> {
    try {
      // Clean old messages
      await this.database.deleteOldMessages(olderThanDays);
      
      // Clean old delivery records
      this.deliveryManager.cleanupOldDeliveries(olderThanDays * 24 * 60 * 60 * 1000);
      
      console.log('Backend cleanup completed');
    } catch (error) {
      console.error('Backend cleanup failed:', error);
    }
  }

  /**
   * Reset all backend data (for debugging)
   */
  async reset(): Promise<void> {
    try {
      await this.database.clearAll();
      await this.keyManager.clearAllKeys();
      this.deliveryManager.clearAll();
      
      this.initialized = false;
      console.log('Backend system reset completed');
    } catch (error) {
      console.error('Backend reset failed:', error);
      throw error;
    }
  }
}