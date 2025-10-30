import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredMessage, PeerInfo } from './types';

/**
 * Database - Mock local storage for messages and peer data (Expo compatible)
 * In production, replace with actual SQLite implementation
 */
export class Database {
  private static instance: Database;
  private initialized = false;
  private messages: StoredMessage[] = [];
  private peers: PeerInfo[] = [];

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize database (mock implementation)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load existing data from AsyncStorage
      await this.loadData();
      
      this.initialized = true;
      console.log('Database initialized successfully (mock)');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Load data from AsyncStorage
   */
  private async loadData(): Promise<void> {
    try {
      const storedMessages = await AsyncStorage.getItem('db_messages');
      if (storedMessages) {
        this.messages = JSON.parse(storedMessages);
      }

      const storedPeers = await AsyncStorage.getItem('db_peers');
      if (storedPeers) {
        this.peers = JSON.parse(storedPeers);
      }

      console.log(`Loaded ${this.messages.length} messages and ${this.peers.length} peers`);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  /**
   * Save data to AsyncStorage
   */
  private async saveData(): Promise<void> {
    try {
      await AsyncStorage.setItem('db_messages', JSON.stringify(this.messages));
      await AsyncStorage.setItem('db_peers', JSON.stringify(this.peers));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(message: StoredMessage): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Remove existing message with same ID
      this.messages = this.messages.filter(m => m.id !== message.id);
      
      // Add new message
      this.messages.push(message);
      
      // Sort by timestamp
      this.messages.sort((a, b) => a.timestamp - b.timestamp);
      
      await this.saveData();
      console.log('Message saved to database:', message.id);
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  }

  /**
   * Get all messages, optionally filtered
   */
  async getAllMessages(limit?: number): Promise<StoredMessage[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      let messages = [...this.messages];
      
      // Sort by timestamp (newest first)
      messages.sort((a, b) => b.timestamp - a.timestamp);
      
      if (limit) {
        messages = messages.slice(0, limit);
      }
      
      // Return in chronological order
      return messages.reverse();
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw error;
    }
  }

  /**
   * Get messages between specific devices
   */
  async getMessagesBetween(device1: string, device2: string): Promise<StoredMessage[]> {
    return this.messages.filter(m => 
      (m.from === device1 && m.to === device2) || 
      (m.from === device2 && m.to === device1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Update message delivery status
   */
  async updateDeliveryStatus(messageId: string, delivered: boolean): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.delivered = delivered;
      await this.saveData();
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      await this.saveData();
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    return this.messages.filter(m => !m.read && m.type === 'received').length;
  }

  /**
   * Save peer information
   */
  async savePeer(peer: PeerInfo): Promise<void> {
    this.peers = this.peers.filter(p => p.id !== peer.id);
    this.peers.push(peer);
    await this.saveData();
  }

  /**
   * Get all peers
   */
  async getAllPeers(): Promise<PeerInfo[]> {
    return [...this.peers].sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Delete old messages (cleanup)
   */
  async deleteOldMessages(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.messages.length;
    this.messages = this.messages.filter(m => m.timestamp >= cutoffTime);
    const deletedCount = initialCount - this.messages.length;
    
    if (deletedCount > 0) {
      await this.saveData();
      console.log(`Deleted ${deletedCount} old messages`);
    }
    
    return deletedCount;
  }

  /**
   * Clear all data (for reset)
   */
  async clearAll(): Promise<void> {
    this.messages = [];
    this.peers = [];
    await AsyncStorage.removeItem('db_messages');
    await AsyncStorage.removeItem('db_peers');
    console.log('All database data cleared');
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return {
      initialized: this.initialized,
      messageCount: this.messages.length,
      peerCount: this.peers.length,
      unreadCount: await this.getUnreadCount(),
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.saveData();
    this.initialized = false;
    console.log('Database connection closed');
  }
}