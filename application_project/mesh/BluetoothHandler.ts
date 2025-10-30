import { Platform } from 'react-native';
import { MeshPeer, MeshMessage, ConnectionInfo } from './types';

// Mock BLE Manager for Expo development
// In production with bare React Native, replace with actual react-native-ble-manager
const MockBleManager = {
  start: async (options: any) => Promise.resolve(),
  enableBluetooth: async () => Promise.resolve(),
  scan: async (serviceUUIDs: string[], scanDuration: number, allowDuplicates: boolean) => Promise.resolve(),
  stopScan: async () => Promise.resolve(),
  connect: async (peripheralId: string) => Promise.resolve(),
  disconnect: async (peripheralId: string) => Promise.resolve(),
  retrieveServices: async (peripheralId: string) => Promise.resolve(),
  write: async (peripheralId: string, serviceUUID: string, characteristicUUID: string, data: number[]) => Promise.resolve(),
};

/**
 * BluetoothHandler - Manages Bluetooth Low Energy communication
 */
export class BluetoothHandler {
  private isInitialized = false;
  private isScanning = false;
  private discoveredPeers = new Map<string, MeshPeer>();
  private connections = new Map<string, ConnectionInfo>();
  private messageCallback?: (message: MeshMessage) => void;
  private peerCallback?: (peers: MeshPeer[]) => void;

  // BLE Service and Characteristic UUIDs for mesh communication
  private readonly SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
  private readonly CHARACTERISTIC_UUID = '87654321-4321-4321-4321-cba987654321';

  constructor() {
    // Mock event listeners for Expo development
    console.log('BluetoothHandler initialized with mock implementation');
  }

  /**
   * Initialize Bluetooth module
   */
  async initialize(): Promise<boolean> {
    try {
      await MockBleManager.start({ showAlert: false });
      
      if (Platform.OS === 'android') {
        await MockBleManager.enableBluetooth();
      }

      this.isInitialized = true;
      console.log('Bluetooth initialized successfully (mock)');
      
      // Simulate discovering a peer after 2 seconds
      setTimeout(() => {
        this.simulateDiscoveredPeer();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
      return false;
    }
  }

  /**
   * Start scanning for nearby mesh devices
   */
  async startDiscovery(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bluetooth not initialized');
    }

    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      await MockBleManager.scan([this.SERVICE_UUID], 10, true);
      console.log('Started Bluetooth discovery (mock)');
      
      // Simulate finding peers
      setTimeout(() => {
        this.simulateDiscoveredPeer();
      }, 1000);
    } catch (error) {
      console.error('Failed to start Bluetooth discovery:', error);
      this.isScanning = false;
    }
  }

  /**
   * Stop scanning
   */
  async stopDiscovery(): Promise<void> {
    if (this.isScanning) {
      await MockBleManager.stopScan();
      this.isScanning = false;
      console.log('Stopped Bluetooth discovery (mock)');
    }
  }

  /**
   * Connect to a discovered peer
   */
  async connectToPeer(peerId: string): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    if (!peer) {
      console.error('Peer not found:', peerId);
      return false;
    }

    try {
      peer.status = 'connecting';
      this.notifyPeerUpdate();

      await MockBleManager.connect(peerId);
      await MockBleManager.retrieveServices(peerId);

      const connection: ConnectionInfo = {
        id: peerId,
        type: 'bluetooth',
        lastActivity: Date.now(),
      };

      this.connections.set(peerId, connection);
      peer.status = 'connected';
      this.notifyPeerUpdate();

      console.log('Connected to Bluetooth peer:', peerId);
      return true;
    } catch (error) {
      console.error('Failed to connect to Bluetooth peer:', error);
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
      console.error('No connection to peer:', peerId);
      return false;
    }

    try {
      const data = JSON.stringify(message);
      const bytes = this.stringToBytes(data);
      
      await MockBleManager.write(
        peerId,
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID,
        bytes
      );

      connection.lastActivity = Date.now();
      console.log('Sent message via Bluetooth to:', peerId);
      return true;
    } catch (error) {
      console.error('Failed to send Bluetooth message:', error);
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
      await MockBleManager.disconnect(peerId);
      this.connections.delete(peerId);
      
      const peer = this.discoveredPeers.get(peerId);
      if (peer) {
        peer.status = 'disconnected';
        this.notifyPeerUpdate();
      }

      console.log('Disconnected from Bluetooth peer:', peerId);
    } catch (error) {
      console.error('Failed to disconnect from Bluetooth peer:', error);
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
   * Simulate discovering a peer (for Expo development)
   */
  private simulateDiscoveredPeer(): void {
    const peerId = `bt-peer-${Date.now()}`;
    const peer: MeshPeer = {
      id: peerId,
      name: `BT-Device-${Math.floor(Math.random() * 1000)}`,
      address: peerId,
      type: 'bluetooth',
      status: 'discovered',
      lastSeen: Date.now(),
    };

    this.discoveredPeers.set(peerId, peer);
    this.notifyPeerUpdate();
    console.log('Discovered Bluetooth mesh device (mock):', peer.name);
    
    // Simulate receiving a message after connection
    setTimeout(() => {
      if (this.connections.has(peerId)) {
        this.simulateIncomingMessage(peerId);
      }
    }, 5000);
  }

  /**
   * Simulate incoming message (for testing)
   */
  private simulateIncomingMessage(fromPeerId: string): void {
    if (!this.messageCallback) {
      return;
    }

    const mockMessage: MeshMessage = {
      id: `bt-msg-${Date.now()}`,
      from: fromPeerId,
      to: 'all',
      mode: 'BROADCAST',
      timestamp: Date.now(),
      payload: 'Hello from Bluetooth!',
      ack: false,
    };

    this.messageCallback(mockMessage);
    console.log('Received Bluetooth message (mock):', mockMessage.id);
  }

  /**
   * Handle device disconnection (mock)
   */
  private handleDeviceDisconnected(peripheralId: string): void {
    this.connections.delete(peripheralId);
    
    const peer = this.discoveredPeers.get(peripheralId);
    if (peer) {
      peer.status = 'disconnected';
      this.notifyPeerUpdate();
    }

    console.log('Bluetooth device disconnected (mock):', peripheralId);
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
   * Convert string to byte array (React Native compatible)
   */
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  /**
   * Convert byte array to string (React Native compatible)
   */
  private bytesToString(bytes: number[]): string {
    return String.fromCharCode(...bytes);
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
  }
}