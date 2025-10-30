import 'react-native-get-random-values';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Message, Peer, MeshStatus, DeviceInfo, ChatMode } from '@/types';
import { dummyPeers, dummyMessages } from '@/utils/dummyData';
import { MeshManager, MeshMessage, MeshPeer } from '@/mesh';

interface AppContextType {
  meshStatus: MeshStatus;
  setMeshStatus: (status: MeshStatus) => void;
  connectedPeers: Peer[];
  setConnectedPeers: (peers: Peer[]) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  deviceInfo: DeviceInfo;
  isLoading: boolean;
  connectToMesh: () => Promise<void>;
  sendMeshMessage: (text: string) => Promise<boolean>;
  meshManager?: MeshManager;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [meshStatus, setMeshStatus] = useState<MeshStatus>({
    bluetooth: false,
    wifiDirect: false,
    isConnected: false,
  });
  const [connectedPeers, setConnectedPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>('BROADCAST');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    id: '',
    publicKey: '',
    privateKey: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [meshManager, setMeshManager] = useState<MeshManager>();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    saveMessagesToStorage();
  }, [messages]);

  const initializeApp = async () => {
    try {
      const storedDeviceInfo = await AsyncStorage.getItem('deviceInfo');
      const storedMessages = await AsyncStorage.getItem('messages');

      let currentDeviceInfo: DeviceInfo;

      if (storedDeviceInfo) {
        currentDeviceInfo = JSON.parse(storedDeviceInfo);
        setDeviceInfo(currentDeviceInfo);
      } else {
        currentDeviceInfo = {
          id: uuidv4(),
          publicKey: generateDummyKey('public'),
          privateKey: generateDummyKey('private'),
        };
        setDeviceInfo(currentDeviceInfo);
        await AsyncStorage.setItem('deviceInfo', JSON.stringify(currentDeviceInfo));
      }

      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else {
        setMessages(dummyMessages);
      }

      // Initialize mesh manager
      const manager = new MeshManager(currentDeviceInfo.id);
      setMeshManager(manager);

      // Set up mesh callbacks
      manager.onMessageReceived((meshMessage: MeshMessage) => {
        const message: Message = {
          id: meshMessage.id,
          text: meshMessage.payload,
          sender: meshMessage.from,
          timestamp: meshMessage.timestamp,
          type: 'received',
          mode: meshMessage.mode,
        };
        addMessage(message);
      });

      manager.onPeerUpdate((meshPeers: MeshPeer[]) => {
        const peers: Peer[] = meshPeers.map(peer => ({
          id: peer.id,
          name: peer.name,
          status: peer.status === 'connected' ? 'connected' : 'nearby',
          lastSeen: peer.lastSeen,
          distance: Math.floor(Math.random() * 100), // Mock distance
        }));
        setConnectedPeers(peers);
      });

      manager.onStatusUpdate((status) => {
        setMeshStatus({
          bluetooth: status.bluetooth,
          wifiDirect: status.wifi,
          isConnected: status.isConnected,
        });
      });

      // Initialize mesh network
      await manager.initMesh();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDummyKey = (type: 'public' | 'private'): string => {
    const prefix = type === 'public' ? 'PUB' : 'PRIV';
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${randomString}${randomString}`;
  };

  const saveMessagesToStorage = async () => {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = async () => {
    setMessages([]);
    await AsyncStorage.removeItem('messages');
  };

  const connectToMesh = async (): Promise<void> => {
    if (!meshManager) {
      console.error('Mesh manager not initialized');
      return;
    }

    try {
      // Start discovery
      await meshManager.startDiscovery();
      
      // Wait a bit for discovery
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Connect to discovered peers
      await meshManager.connectToMesh();
    } catch (error) {
      console.error('Failed to connect to mesh:', error);
    }
  };

  const sendMeshMessage = async (text: string): Promise<boolean> => {
    if (!meshManager) {
      console.error('Mesh manager not initialized');
      return false;
    }

    try {
      const success = await meshManager.sendMessage(mode, text);
      
      if (success) {
        // Add to local messages
        const message: Message = {
          id: uuidv4(),
          text,
          sender: deviceInfo.id,
          timestamp: Date.now(),
          type: 'sent',
          mode,
        };
        addMessage(message);
      }

      return success;
    } catch (error) {
      console.error('Failed to send mesh message:', error);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        meshStatus,
        setMeshStatus,
        connectedPeers,
        setConnectedPeers,
        messages,
        addMessage,
        clearMessages,
        mode,
        setMode,
        deviceInfo,
        isLoading,
        connectToMesh,
        sendMeshMessage,
        meshManager,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};