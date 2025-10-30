export interface MeshMessage {
  id: string;
  from: string;
  to: string; // 'all' for broadcast or specific device ID
  mode: 'BROADCAST' | 'SECURE';
  timestamp: number;
  payload: string;
  ack: boolean;
}

export interface MeshPeer {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth' | 'wifi' | 'tcp';
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected';
  lastSeen: number;
}

export interface MeshStatus {
  bluetooth: boolean;
  wifi: boolean;
  isConnected: boolean;
  activePeers: number;
}

export interface ConnectionInfo {
  id: string;
  type: 'bluetooth' | 'wifi' | 'tcp';
  socket?: any;
  lastActivity: number;
}

export type MessageCallback = (message: MeshMessage) => void;
export type PeerCallback = (peers: MeshPeer[]) => void;
export type StatusCallback = (status: MeshStatus) => void;