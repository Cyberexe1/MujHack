export type ChatMode = 'BROADCAST' | 'SECURE';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'sent' | 'received';
  mode: ChatMode;
}

export interface Peer {
  id: string;
  name: string;
  status: 'connected' | 'nearby' | 'disconnected';
  lastSeen: number;
  distance: number;
}

export interface MeshStatus {
  bluetooth: boolean;
  wifiDirect: boolean;
  isConnected: boolean;
}

export interface DeviceInfo {
  id: string;
  publicKey: string;
  privateKey: string;
}
