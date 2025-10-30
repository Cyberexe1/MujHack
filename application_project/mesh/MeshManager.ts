import { MeshMessage, MeshPeer, MeshStatus, MessageCallback, PeerCallback, StatusCallback } from './types';
import { BluetoothHandler } from './BluetoothHandler';
import { WiFiHandler } from './WiFiHandler';
import { MessageRouter } from './MessageRouter';
import { HybridMeshService } from '../services/HybridMeshService';

/**
 * MeshManager - Main controller for the mesh communication system
 */
export class MeshManager {
  private bluetoothHandler: BluetoothHandler;
  private wifiHandler: WiFiHandler;
  private messageRouter: MessageRouter;
  private hybridMesh: HybridMeshService;
  private deviceId: string;

  private isInitialized = false;
  private discoveryActive = false;

  // Callbacks
  private messageCallback?: MessageCallback;
  private peerCallback?: PeerCallback;
  private statusCallback?: StatusCallback;

  // Peer management
  private connectedPeers: MeshPeer[] = [];

  // Auto-discovery settings
  private discoveryInterval?: any;
  private readonly discoveryIntervalMs = 30000; // 30 seconds

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.bluetoothHandler = new BluetoothHandler();
    this.wifiHandler = new WiFiHandler();
    this.messageRouter = new MessageRouter(deviceId);
    this.hybridMesh = HybridMeshService.getInstance();
  }

  /**
   * Initialize the mesh network system
   */
  async initMesh(): Promise<MeshStatus> {
    console.log('Initializing hybrid mesh network...');

    try {
      // Initialize only HybridMeshService for real BLE + WiFi Direct communication
      await this.hybridMesh.initialize(this.deviceId, `Device-${this.deviceId.slice(-4)}`);

      // Set up callbacks
      this.setupCallbacks();

      this.isInitialized = true;

      const status: MeshStatus = {
        bluetooth: true, // Will be determined by HybridMeshService
        wifi: true,      // Will be determined by HybridMeshService
        isConnected: false,
        activePeers: 0,
      };

      console.log('Hybrid mesh network initialized successfully');
      this.notifyStatusUpdate(status);

      return status;
    } catch (error) {
      console.error('Failed to initialize hybrid mesh network:', error);
      throw error;
    }
  }

  /**
   * Start discovering nearby devices
   */
  async startDiscovery(): Promise<MeshPeer[]> {
    if (!this.isInitialized) {
      throw new Error('Mesh network not initialized');
    }

    if (this.discoveryActive) {
      console.log('Discovery already active');
      return [];
    }

    console.log('Starting hybrid mesh discovery...');
    this.discoveryActive = true;

    try {
      // Use only HybridMeshService for real device discovery
      await this.hybridMesh.joinMesh();
      
      console.log('Hybrid mesh discovery started successfully');
      return [];
    } catch (error) {
      console.error('Failed to start hybrid mesh discovery:', error);
      this.discoveryActive = false;
      throw error;
    }
  }

  /**
   * Stop device discovery
   */
  async stopDiscovery(): Promise<void> {
    if (!this.discoveryActive) {
      return;
    }

    console.log('Stopping device discovery...');
    this.discoveryActive = false;

    // Stop periodic discovery
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }

    // Stop discovery on both channels
    await Promise.allSettled([
      this.bluetoothHandler.stopDiscovery(),
      this.wifiHandler.stopDiscovery(),
    ]);

    console.log('Discovery stopped');
  }

  /**
   * Connect to all discovered peers
   */
  async connectToMesh(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Mesh network not initialized');
    }

    console.log('Connecting to mesh network...');

    const peers = this.messageRouter.getAllPeers();
    const discoveredPeers = peers.filter(peer => peer.status === 'discovered');

    if (discoveredPeers.length === 0) {
      console.log('No peers available to connect');
      return false;
    }

    // Connect to all discovered peers
    const connectionPromises = discoveredPeers.map(async (peer) => {
      try {
        if (peer.type === 'bluetooth') {
          return await this.bluetoothHandler.connectToPeer(peer.id);
        } else {
          return await this.wifiHandler.connectToPeer(peer.id);
        }
      } catch (error) {
        console.error(`Failed to connect to peer ${peer.id}:`, error);
        return false;
      }
    });

    const results = await Promise.allSettled(connectionPromises);
    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value === true
    ).length;

    const success = successCount > 0;
    console.log(`Connected to ${successCount}/${discoveredPeers.length} peers`);

    // Update status
    this.updateAndNotifyStatus();

    return success;
  }

  /**
   * Send message through the mesh network
   */
  async sendMessage(mode: 'BROADCAST' | 'SECURE', payload: string, targetPeerId?: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Mesh network not initialized');
    }

    console.log('Sending message via hybrid mesh:', { mode, targetPeerId, payloadLength: payload.length });

    try {
      // Send only via HybridMeshService for real device communication
      const message: MeshMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from: this.deviceId,
        to: targetPeerId || 'all',
        mode,
        timestamp: Date.now(),
        payload,
        ack: false,
      };

      const success = await this.hybridMesh.sendMessage(message);

      if (!success) {
        console.warn('Hybrid mesh message send failed - no active connections');
      } else {
        console.log('Message sent successfully via hybrid mesh:', message.id);
      }

      return success;
    } catch (error) {
      console.error('Failed to send hybrid mesh message:', error);
      return false;
    }
  }

  /**
   * Register callback for incoming messages
   */
  onMessageReceived(callback: MessageCallback): void {
    this.messageCallback = callback;
    // Only use HybridMeshService callbacks (setupCallbacks already handles this)
    console.log('Message callback registered for hybrid mesh');
  }

  /**
   * Register callback for peer updates
   */
  onPeerUpdate(callback: PeerCallback): void {
    this.peerCallback = callback;
  }

  /**
   * Register callback for status updates
   */
  onStatusUpdate(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Get current mesh status
   */
  getStatus(): MeshStatus {
    const connectedPeers = this.messageRouter.getConnectedPeers();

    return {
      bluetooth: this.bluetoothHandler ? true : false,
      wifi: this.wifiHandler ? true : false,
      isConnected: connectedPeers.length > 0,
      activePeers: connectedPeers.length,
    };
  }

  /**
   * Get all discovered peers
   */
  getPeers(): MeshPeer[] {
    return this.messageRouter.getAllPeers();
  }

  /**
   * Get connected peers only
   */
  getConnectedPeers(): MeshPeer[] {
    return this.messageRouter.getConnectedPeers();
  }

  /**
   * Get mesh statistics
   */
  async getStats() {
    const routerStats = this.messageRouter.getStats();
    const hybridStats = await this.hybridMesh.getStats();
    
    return {
      ...routerStats,
      ...hybridStats,
      isInitialized: this.isInitialized,
      discoveryActive: this.discoveryActive,
      deviceId: this.deviceId,
      // Ensure compatibility with MeshDemo expectations
      totalPeers: hybridStats.totalPeers || 0,
      connectedPeers: hybridStats.bleConnections + hybridStats.wifiConnections || 0,
      cache: { size: hybridStats.queuedMessages || 0 },
      pendingAcks: 0, // Not implemented in hybrid mesh yet
    };
  }

  /**
   * Disconnect from a specific peer
   */
  async disconnectPeer(peerId: string): Promise<void> {
    const peer = this.messageRouter.getAllPeers().find(p => p.id === peerId);

    if (!peer) {
      console.warn('Peer not found:', peerId);
      return;
    }

    try {
      if (peer.type === 'bluetooth') {
        await this.bluetoothHandler.disconnectPeer(peerId);
      } else {
        await this.wifiHandler.disconnectPeer(peerId);
      }

      console.log('Disconnected from peer:', peerId);
      this.updateAndNotifyStatus();
    } catch (error) {
      console.error('Failed to disconnect from peer:', error);
    }
  }

  /**
   * Setup internal callbacks
   */
  private setupCallbacks(): void {
    // Set up hybrid mesh callbacks for BLE + WiFi Direct communication
    this.hybridMesh.setMessageCallback((message) => {
      console.log('Received hybrid mesh message:', message.id, 'from:', message.from);
      if (this.messageCallback) {
        this.messageCallback(message);
      }
    });

    this.hybridMesh.setPeerCallback((peers: MeshPeer[]) => {
      console.log('Hybrid mesh peers updated:', peers.length);
      // Update internal peer list
      this.connectedPeers = peers.filter(p => p.status === 'connected');
      
      // Notify UI
      if (this.peerCallback) {
        this.peerCallback(peers);
      }
      
      // Update status
      this.updateAndNotifyStatus();
    });
  }

  /**
   * Handle peer list updates
   */
  private handlePeerUpdate(): void {
    const allPeers = this.messageRouter.getAllPeers();

    if (this.peerCallback) {
      this.peerCallback(allPeers);
    }

    // Update status when peer list changes
    this.updateAndNotifyStatus();
  }

  /**
   * Update and notify status changes
   */
  private updateAndNotifyStatus(): void {
    const status = this.getStatus();
    this.notifyStatusUpdate(status);
  }

  /**
   * Notify status update
   */
  private notifyStatusUpdate(status: MeshStatus): void {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Start periodic discovery to find new peers
   */
  private startPeriodicDiscovery(): void {
    if (this.discoveryInterval) {
      return;
    }

    this.discoveryInterval = setInterval(async () => {
      if (this.discoveryActive) {
        console.log('Periodic discovery scan...');

        try {
          await Promise.allSettled([
            this.bluetoothHandler.startDiscovery(),
            this.wifiHandler.startDiscovery(),
          ]);
        } catch (error) {
          console.warn('Periodic discovery failed:', error);
        }
      }
    }, this.discoveryIntervalMs);
  }

  /**
   * Cleanup and shutdown mesh network
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up mesh network...');

    await this.stopDiscovery();

    // Cleanup handlers
    await Promise.allSettled([
      this.bluetoothHandler.cleanup(),
      this.wifiHandler.cleanup(),
    ]);

    // Cleanup router
    this.messageRouter.cleanup();

    // Leave hybrid mesh
    await this.hybridMesh.leaveMesh();

    this.isInitialized = false;
    console.log('Mesh network cleanup complete');
  }
}