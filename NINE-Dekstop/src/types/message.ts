export interface HopInfo {
  nodeId: string;
  timestamp: string;
}

export interface MessageMeta {
  name?: string;
  location?: string;
  contact?: string;
  imageRef?: string;
}

export type MessageType = 'broadcast' | 'e2e';

export interface MessageEnvelope {
  msg_id: string;
  type: MessageType;
  from: string;
  to: string;
  timestamp: string;
  ttl: number;
  hops: HopInfo[];
  payload: string;
  meta?: MessageMeta;
}

export interface KeyEnvelope {
  msg_id: string;
  from: string;
  to: string;
  wrapped_key: string;
  algorithm: string;
}

export interface AdminKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface DecryptedMessage {
  msg_id: string;
  content: string;
  image?: string;
  timestamp: string;
  from: string;
  meta?: MessageMeta;
  messagePath: HopInfo[];
  keyPath: HopInfo[];
}
