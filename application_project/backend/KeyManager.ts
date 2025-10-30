import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncryptionUtils } from './EncryptionUtils';
import { KeyPair, PeerInfo } from './types';

/**
 * KeyManager - Manages cryptographic keys and peer key storage
 */
export class KeyManager {
  private static instance: KeyManager;
  private keyPair: KeyPair | null = null;
  private peerKeys = new Map<string, PeerInfo>();
  private initialized = false;

  private constructor() {}

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * Initialize key manager - generate or load keys
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try to load existing keys
      await this.loadKeys();
      
      // Generate new keys if none exist
      if (!this.keyPair) {
        await this.generateAndStoreKeys();
      }

      // Load known peer keys
      await this.loadPeerKeys();

      this.initialized = true;
      console.log('KeyManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize KeyManager:', error);
      throw error;
    }
  }

  /**
   * Generate new key pair and store securely
   */
  private async generateAndStoreKeys(): Promise<void> {
    try {
      console.log('Generating new RSA key pair...');
      this.keyPair = EncryptionUtils.generateRSAKeyPair();
      
      // Store keys securely
      await AsyncStorage.setItem('device_keys', JSON.stringify(this.keyPair));
      
      console.log('Key pair generated and stored');
    } catch (error) {
      console.error('Failed to generate keys:', error);
      throw error;
    }
  }

  /**
   * Load existing keys from storage
   */
  private async loadKeys(): Promise<void> {
    try {
      const storedKeys = await AsyncStorage.getItem('device_keys');
      if (storedKeys) {
        this.keyPair = JSON.parse(storedKeys);
        console.log('Loaded existing key pair');
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  }

  /**
   * Load known peer keys from storage
   */
  private async loadPeerKeys(): Promise<void> {
    try {
      const storedPeers = await AsyncStorage.getItem('peer_keys');
      if (storedPeers) {
        const peers: PeerInfo[] = JSON.parse(storedPeers);
        peers.forEach(peer => {
          this.peerKeys.set(peer.id, peer);
        });
        console.log(`Loaded ${peers.length} peer keys`);
      }
    } catch (error) {
      console.error('Failed to load peer keys:', error);
    }
  }

  /**
   * Save peer keys to storage
   */
  private async savePeerKeys(): Promise<void> {
    try {
      const peers = Array.from(this.peerKeys.values());
      await AsyncStorage.setItem('peer_keys', JSON.stringify(peers));
    } catch (error) {
      console.error('Failed to save peer keys:', error);
    }
  }

  /**
   * Get device's public key
   */
  getPublicKey(): string {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }
    return this.keyPair.publicKey;
  }

  /**
   * Get device's private key
   */
  getPrivateKey(): string {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }
    return this.keyPair.privateKey;
  }

  /**
   * Add or update a peer's public key
   */
  async addPeerKey(peerId: string, name: string, publicKey: string): Promise<void> {
    const peerInfo: PeerInfo = {
      id: peerId,
      name,
      publicKey,
      lastActive: Date.now(),
      trusted: false, // Manual trust verification needed
    };

    this.peerKeys.set(peerId, peerInfo);
    await this.savePeerKeys();
    
    console.log(`Added peer key for ${name} (${peerId})`);
  }

  /**
   * Get a peer's public key
   */
  getPeerKey(peerId: string): string | null {
    const peer = this.peerKeys.get(peerId);
    return peer ? peer.publicKey : null;
  }

  /**
   * Get peer information
   */
  getPeerInfo(peerId: string): PeerInfo | null {
    return this.peerKeys.get(peerId) || null;
  }

  /**
   * Get all known peers
   */
  getAllPeers(): PeerInfo[] {
    return Array.from(this.peerKeys.values());
  }

  /**
   * Mark peer as trusted
   */
  async trustPeer(peerId: string): Promise<void> {
    const peer = this.peerKeys.get(peerId);
    if (peer) {
      peer.trusted = true;
      peer.lastActive = Date.now();
      await this.savePeerKeys();
      console.log(`Marked peer ${peerId} as trusted`);
    }
  }

  /**
   * Update peer's last active time
   */
  async updatePeerActivity(peerId: string): Promise<void> {
    const peer = this.peerKeys.get(peerId);
    if (peer) {
      peer.lastActive = Date.now();
      await this.savePeerKeys();
    }
  }

  /**
   * Remove a peer's key
   */
  async removePeerKey(peerId: string): Promise<void> {
    if (this.peerKeys.delete(peerId)) {
      await this.savePeerKeys();
      console.log(`Removed peer key for ${peerId}`);
    }
  }

  /**
   * Check if we have a peer's public key
   */
  hasPeerKey(peerId: string): boolean {
    return this.peerKeys.has(peerId);
  }

  /**
   * Generate a key exchange message for handshake
   */
  generateKeyExchangeMessage(deviceId: string, deviceName: string): any {
    return {
      type: 'key_exchange',
      deviceId,
      deviceName,
      publicKey: this.getPublicKey(),
      timestamp: Date.now(),
    };
  }

  /**
   * Process incoming key exchange message
   */
  async processKeyExchange(message: any): Promise<boolean> {
    try {
      if (message.type !== 'key_exchange') {
        return false;
      }

      await this.addPeerKey(
        message.deviceId,
        message.deviceName,
        message.publicKey
      );

      return true;
    } catch (error) {
      console.error('Failed to process key exchange:', error);
      return false;
    }
  }

  /**
   * Clear all keys (for reset/debugging)
   */
  async clearAllKeys(): Promise<void> {
    this.keyPair = null;
    this.peerKeys.clear();
    await AsyncStorage.removeItem('device_keys');
    await AsyncStorage.removeItem('peer_keys');
    this.initialized = false;
    console.log('All keys cleared');
  }

  /**
   * Get key manager statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      hasKeys: !!this.keyPair,
      peerCount: this.peerKeys.size,
      trustedPeers: Array.from(this.peerKeys.values()).filter(p => p.trusted).length,
    };
  }
}