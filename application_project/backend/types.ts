export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  id: string;
  from: string;
  to: string;
  mode: 'BROADCAST' | 'SECURE';
  timestamp: number;
  encryptedKey?: string; // RSA encrypted AES key (for SECURE mode)
  ciphertext: string; // AES encrypted payload
  iv: string;
  tag: string;
  signature?: string; // Digital signature for authenticity
}

export interface StoredMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  mode: 'BROADCAST' | 'SECURE';
  type: 'sent' | 'received';
  delivered: boolean;
  read: boolean;
}

export interface PeerInfo {
  id: string;
  name: string;
  publicKey: string;
  lastActive: number;
  trusted: boolean;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt: number;
}

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
}