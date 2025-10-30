/**
 * HybridMeshService - DEBUGGED VERSION
 * Simplified and more reliable BLE + WiFi Direct implementation
 */

import { MeshMessage, MeshPeer } from '@/mesh/types';
import { Platform, PermissionsAndroid, NativeEventEmitter } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// WiFi P2P for Android (with error handling)
let WiFiP2P: any = null;
try {
  WiFiP2P = require('react-native-wifi-p2p');
} catch (error) {
  console.log('WiFi P2P not available:', error);
}

export class HybridMeshService {
  private static instance: HybridMeshService;
  private deviceId: string = '';
  private deviceName: string = '';
  private isActive = false;
  private isInitialized = false;

  // BLE Configuration
  private readonly BLE_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  private readonly BLE_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
  private bleConnections = new Map<string, any>();
  private discoveredBLEDevices = new Map<string, MeshPeer>();
  private bleScanning = false;
  private bleInitialized = false;

  // WiFi Direct Configuration
  private wifiP2PConnections = new Map<string, any>();
  private discoveredWiFiDevices = new Map<string, MeshPeer>();
  private wifiP2PActive = false;

  // Callbacks
  private messageCallback?: (message: MeshMessage) => void;
  private peerCallback?: (peers: MeshPeer[]) => void;

  // Discovery and maintenance
  private discoveryInterval?: any;
  private connectionMaintenanceInterval?: any;
  private readonly DISCOVERY_INTERVAL = 8000;
  private readonly MAINTENANCE_INTERVAL = 15000;

  // Message routing
  private messageQueue: MeshMessage[] = [];
  private sentMessages = new Set<string>();

  private constructor() {}

  static getInstance(): HybridMeshService {
    if (!HybridMeshService.instance) {
      HybridMeshService.instance = new HybridMeshService();
    }
    return HybridMeshService.instance;
  }

  /**
   * Initialize the hybrid mesh service
   */
  async initialize(deviceId: string, deviceName: string): Promise<void> {
    if (this.isInitialized) {
      console.log('HybridMeshService already initialized');
      return;
    }

    this.deviceId = deviceId;
    this.deviceName = deviceName;

    console.log(`HybridMeshService initializing for ${deviceName} (${deviceId})`);

    try {
      // Request permissions first
      const permissionsGranted = await this.requestPermissions();
      if (!permissionsGranted) {
        console.warn('Required permissions not granted, some features may not work');
      }

      // Initialize BLE
      await this.initializeBLE();

      // Initialize WiFi Direct (Android only)
      if (Platform.OS === 'android' && WiFiP2P) {
        await this.initializeWiFiDirect();
      }

      this.isInitialized = true;
      console.log('HybridMeshService initialized successfully');
    } catch (error) {
      console.error('HybridMeshService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request necessary permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        if (Platform.Version >= 31) {
          permissions.push(
            'android.permission.BLUETOOTH_SCAN' as any,
            'android.permission.BLUETOOTH_ADVERTISE' as any,
            'android.permission.BLUETOOTH_CONNECT' as any
          );
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions as any);
        console.log('Android permissions result:', granted);

        const locationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted';
        return locationGranted;

      } else if (Platform.OS === 'ios') {
        const bluetoothResult = await request(PERMISSIONS.IOS.BLUETOOTH);
        const locationResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        
        console.log('iOS permissions:', { bluetoothResult, locationResult });
        return bluetoothResult === RESULTS.GRANTED;
      }

      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Initialize Bluetooth Low Energy
   */
  private async initializeBLE(): Promise<void> {
    if (this.bleInitialized) {
      return;
    }

    try {
      await BleManager.start({ showAlert: false });
      console.log('BLE Manager started successfully');

      try {
        const BleManagerModule = require('react-native-ble-manager');
        const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

        bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', (peripheral) => {
          this.handleBLEDeviceDiscovered(peripheral);
        });

        bleManagerEmitter.addListener('BleManagerStopScan', () => {
          this.bleScanning = false;
        });

        console.log('BLE event listeners set up successfully');
      } catch (error) {
        console.error('BLE event listener setup failed:', error);
      }

      this.bleInitialized = true;
    } catch (error) {
      console.error('BLE initialization failed:', error);
    }
  }

  /**
   * Initialize WiFi Direct
   */
  private async initializeWiFiDirect(): Promise<void> {
    if (!WiFiP2P || Platform.OS !== 'android') {
      return;
    }

    try {
      await WiFiP2P.initialize();
      console.log('WiFi Direct initialized successfully');

      try {
        const wifiP2PEmitter = new NativeEventEmitter(WiFiP2P);

        wifiP2PEmitter.addListener('WIFI_P2P_PEERS_CHANGED', (event) => {
          this.handleWiFiPeersChanged(event);
        });

        console.log('WiFi Direct event listeners set up successfully');
      } catch (error) {
        console.error('WiFi Direct event listener setup failed:', error);
      }

    } catch (error) {
      console.error('WiFi Direct initialization failed:', error);
    }
  }

  /**
   * Join the hybrid mesh network
   */
  async joinMesh(): Promise<void> {
    console.log('🔵 HybridMeshService.joinMesh() called');
    
    if (!this.isInitialized) {
      console.error('❌ HybridMeshService not initialized');
      throw new Error('HybridMeshService not initialized');
    }

    if (this.isActive) {
      console.log('✅ Mesh already active, skipping join');
      return;
    }

    this.isActive = true;
    console.log(`🔵 ${this.deviceName} joining hybrid mesh network`);

    try {
      if (this.bleInitialized) {
        console.log('🔵 Starting BLE scanning...');
        await this.startBLEScanning();
      } else {
        console.warn('⚠️ BLE not initialized, skipping BLE operations');
      }

      if (Platform.OS === 'android' && WiFiP2P) {
        console.log('📶 Starting WiFi Direct operations...');
        await this.startWiFiDirectOperations();
      } else {
        console.log('📶 WiFi Direct not available on this platform');
      }

      console.log('🔄 Starting discovery and maintenance...');
      this.startDiscovery();
      this.startConnectionMaintenance();

      console.log('✅ Successfully joined hybrid mesh network');
    } catch (error) {
      console.error('❌ Failed to join mesh network:', error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Leave the hybrid mesh network
   */
  async leaveMesh(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }

    if (this.connectionMaintenanceInterval) {
      clearInterval(this.connectionMaintenanceInterval);
      this.connectionMaintenanceInterval = undefined;
    }

    if (this.bleInitialized) {
      await this.stopBLEOperations();
    }

    console.log('Successfully left hybrid mesh network');
  }

  /**
   * Start BLE scanning
   */
  private async startBLEScanning(): Promise<void> {
    if (this.bleScanning || !this.bleInitialized) {
      return;
    }

    try {
      this.bleScanning = true;
      await BleManager.scan([], 10, false);
      console.log('BLE scanning started successfully');
    } catch (error) {
      console.error('BLE scanning failed:', error);
      this.bleScanning = false;
    }
  }

  /**
   * Start WiFi Direct operations
   */
  private async startWiFiDirectOperations(): Promise<void> {
    if (!WiFiP2P || Platform.OS !== 'android') {
      return;
    }

    try {
      await WiFiP2P.discoverPeers();
      this.wifiP2PActive = true;
      console.log('WiFi Direct operations started successfully');
    } catch (error) {
      console.error('Failed to start WiFi Direct operations:', error);
    }
  }

  /**
   * Send message through hybrid mesh
   */
  async sendMessage(message: MeshMessage): Promise<boolean> {
    console.log('📤 HybridMeshService.sendMessage() called:', message.id);
    
    if (!this.isActive) {
      console.warn('❌ Hybrid mesh not active');
      return false;
    }

    if (this.sentMessages.has(message.id)) {
      console.log('✅ Message already sent:', message.id);
      return true;
    }

    this.sentMessages.add(message.id);
    let success = false;

    try {
      // Try BLE first
      if (this.bleInitialized && this.bleConnections.size > 0) {
        console.log('🔵 Attempting BLE send, connections:', this.bleConnections.size);
        const bleSuccess = await this.sendViaBLE(message);
        if (bleSuccess) {
          console.log('✅ BLE send successful');
          success = true;
        } else {
          console.log('❌ BLE send failed');
        }
      } else {
        console.log('⚠️ BLE not available or no connections');
      }

      // Try WiFi Direct as fallback
      if (Platform.OS === 'android' && WiFiP2P && this.wifiP2PActive) {
        console.log('📶 Attempting WiFi Direct send');
        const wifiSuccess = await this.sendViaWiFiDirect(message);
        if (wifiSuccess) {
          console.log('✅ WiFi Direct send successful');
          success = true;
        } else {
          console.log('❌ WiFi Direct send failed');
        }
      } else {
        console.log('⚠️ WiFi Direct not available');
      }

      if (!success) {
        console.log('📋 Queuing message for retry:', message.id);
        this.messageQueue.push(message);
      }

      console.log('📤 Message send result:', success ? 'SUCCESS' : 'FAILED');
      return success;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send message via BLE
   */
  private async sendViaBLE(message: MeshMessage): Promise<boolean> {
    try {
      const messageData = JSON.stringify({
        type: 'mesh_message',
        message,
        from: this.deviceId,
        timestamp: Date.now(),
      });

      let success = false;

      for (const [deviceId] of this.bleConnections) {
        try {
          await BleManager.write(
            deviceId,
            this.BLE_SERVICE_UUID,
            this.BLE_CHARACTERISTIC_UUID,
            Array.from(Buffer.from(messageData, 'utf8'))
          );
          success = true;
        } catch (error) {
          console.error(`BLE send to ${deviceId} failed:`, error);
          this.bleConnections.delete(deviceId);
        }
      }

      return success;
    } catch (error) {
      console.error('BLE message send failed:', error);
      return false;
    }
  }

  /**
   * Send message via WiFi Direct
   */
  private async sendViaWiFiDirect(message: MeshMessage): Promise<boolean> {
    try {
      // WiFi Direct implementation would go here
      console.log('WiFi Direct send:', message.id);
      return this.wifiP2PConnections.size > 0;
    } catch (error) {
      console.error('WiFi Direct message send failed:', error);
      return false;
    }
  }

  /**
   * Handle BLE device discovered
   */
  private handleBLEDeviceDiscovered(peripheral: any): void {
    try {
      const isMeshDevice = peripheral.name && (
        peripheral.name.includes('Mesh') ||
        peripheral.name.includes('Device-')
      );

      if (isMeshDevice && peripheral.id !== this.deviceId) {
        const peer: MeshPeer = {
          id: peripheral.id,
          name: peripheral.name || `BLE-${peripheral.id.slice(-4)}`,
          address: peripheral.id,
          type: 'bluetooth',
          status: 'discovered',
          lastSeen: Date.now(),
        };

        this.discoveredBLEDevices.set(peripheral.id, peer);
        this.notifyPeerUpdate();

        if (this.bleConnections.size < 5) {
          this.connectToBLEDevice(peripheral.id);
        }
      }
    } catch (error) {
      console.error('Error handling BLE device discovery:', error);
    }
  }

  /**
   * Connect to BLE device
   */
  private async connectToBLEDevice(deviceId: string): Promise<void> {
    if (this.bleConnections.has(deviceId)) {
      return;
    }

    try {
      await BleManager.connect(deviceId);
      await BleManager.retrieveServices(deviceId);

      this.bleConnections.set(deviceId, { deviceId, connected: true });

      const peer = this.discoveredBLEDevices.get(deviceId);
      if (peer) {
        peer.status = 'connected';
        this.discoveredBLEDevices.set(deviceId, peer);
        this.notifyPeerUpdate();
      }
    } catch (error) {
      console.error(`Failed to connect to BLE device ${deviceId}:`, error);
      this.discoveredBLEDevices.delete(deviceId);
    }
  }

  /**
   * Handle WiFi P2P peers changed
   */
  private handleWiFiPeersChanged(event: any): void {
    try {
      if (event.peers && Array.isArray(event.peers)) {
        event.peers.forEach((peer: any) => {
          if (peer.deviceAddress && peer.deviceAddress !== this.deviceId) {
            const meshPeer: MeshPeer = {
              id: peer.deviceAddress,
              name: peer.deviceName || `WiFi-${peer.deviceAddress.slice(-4)}`,
              address: peer.deviceAddress,
              type: 'wifi',
              status: 'discovered',
              lastSeen: Date.now(),
            };

            this.discoveredWiFiDevices.set(peer.deviceAddress, meshPeer);
          }
        });

        this.notifyPeerUpdate();
      }
    } catch (error) {
      console.error('Error handling WiFi peers changed:', error);
    }
  }

  /**
   * Start discovery process
   */
  private startDiscovery(): void {
    this.discoveryInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        if (this.bleInitialized && !this.bleScanning) {
          await this.startBLEScanning();
        }

        if (Platform.OS === 'android' && WiFiP2P && this.wifiP2PActive) {
          await WiFiP2P.discoverPeers();
        }

        await this.processMessageQueue();
      } catch (error) {
        console.error('Discovery cycle failed:', error);
      }
    }, this.DISCOVERY_INTERVAL);
  }

  /**
   * Start connection maintenance
   */
  private startConnectionMaintenance(): void {
    this.connectionMaintenanceInterval = setInterval(() => {
      if (!this.isActive) return;

      const now = Date.now();
      const timeout = 60000;

      for (const [deviceId, peer] of this.discoveredBLEDevices) {
        if (now - peer.lastSeen > timeout) {
          this.discoveredBLEDevices.delete(deviceId);
          this.bleConnections.delete(deviceId);
        }
      }

      for (const [deviceId, peer] of this.discoveredWiFiDevices) {
        if (now - peer.lastSeen > timeout) {
          this.discoveredWiFiDevices.delete(deviceId);
          this.wifiP2PConnections.delete(deviceId);
        }
      }

      this.notifyPeerUpdate();
    }, this.MAINTENANCE_INTERVAL);
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    const messagesToRetry = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messagesToRetry) {
      try {
        const success = await this.sendMessage(message);
        if (!success && this.messageQueue.length < 50) {
          this.messageQueue.push(message);
        }
      } catch (error) {
        console.error('Message retry failed:', error);
      }
    }
  }

  /**
   * Stop BLE operations
   */
  private async stopBLEOperations(): Promise<void> {
    if (!this.bleInitialized) return;

    try {
      if (this.bleScanning) {
        await BleManager.stopScan();
        this.bleScanning = false;
      }

      for (const [deviceId] of this.bleConnections) {
        try {
          await BleManager.disconnect(deviceId);
        } catch (error) {
          console.error(`Failed to disconnect BLE device ${deviceId}:`, error);
        }
      }

      this.bleConnections.clear();
      this.discoveredBLEDevices.clear();
    } catch (error) {
      console.error('Failed to stop BLE operations:', error);
    }
  }

  /**
   * Notify peer update
   */
  private notifyPeerUpdate(): void {
    if (this.peerCallback) {
      const allPeers = [
        ...Array.from(this.discoveredBLEDevices.values()),
        ...Array.from(this.discoveredWiFiDevices.values()),
      ];
      this.peerCallback(allPeers);
    }
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
   * Get current mesh statistics
   */
  async getStats() {
    return {
      isActive: this.isActive,
      isInitialized: this.isInitialized,
      bleInitialized: this.bleInitialized,
      bleDevices: this.discoveredBLEDevices.size,
      bleConnections: this.bleConnections.size,
      wifiDevices: this.discoveredWiFiDevices.size,
      wifiConnections: this.wifiP2PConnections.size,
      totalPeers: this.discoveredBLEDevices.size + this.discoveredWiFiDevices.size,
      queuedMessages: this.messageQueue.length,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clearData(): Promise<void> {
    await this.leaveMesh();
    this.discoveredBLEDevices.clear();
    this.discoveredWiFiDevices.clear();
    this.bleConnections.clear();
    this.wifiP2PConnections.clear();
    this.messageQueue = [];
    this.sentMessages.clear();
    this.notifyPeerUpdate();
  }
}