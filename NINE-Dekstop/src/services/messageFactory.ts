import { v4 as uuidv4 } from 'uuid';
import { MessageEnvelope, KeyEnvelope, MessageMeta } from '../types/message';
import { NodeIdGenerator } from '../utils/nodeId';

export class MessageFactory {
  private static readonly DEFAULT_TTL = 8;

  static createBroadcastMessage(
    content: string,
    meta?: MessageMeta
  ): MessageEnvelope {
    const nodeId = NodeIdGenerator.getOrCreateNodeId();

    return {
      msg_id: uuidv4(),
      type: 'broadcast',
      from: NodeIdGenerator.getPseudoId(),
      to: 'all',
      timestamp: new Date().toISOString(),
      ttl: this.DEFAULT_TTL,
      hops: [
        {
          nodeId: nodeId,
          timestamp: new Date().toISOString(),
        },
      ],
      payload: content,
      meta: meta,
    };
  }

  static createE2EMessageEnvelope(
    encryptedPayload: string,
    meta?: MessageMeta
  ): MessageEnvelope {
    const nodeId = NodeIdGenerator.getOrCreateNodeId();

    return {
      msg_id: uuidv4(),
      type: 'e2e',
      from: NodeIdGenerator.getPseudoId(),
      to: 'admin',
      timestamp: new Date().toISOString(),
      ttl: this.DEFAULT_TTL,
      hops: [
        {
          nodeId: nodeId,
          timestamp: new Date().toISOString(),
        },
      ],
      payload: encryptedPayload,
      meta: meta,
    };
  }

  static createKeyEnvelope(
    msgId: string,
    wrappedKey: string
  ): KeyEnvelope {
    return {
      msg_id: msgId,
      from: NodeIdGenerator.getPseudoId(),
      to: 'admin',
      wrapped_key: wrappedKey,
      algorithm: 'x25519+aes-256-gcm',
    };
  }

  static addHop(envelope: MessageEnvelope): MessageEnvelope {
    const nodeId = NodeIdGenerator.getOrCreateNodeId();

    return {
      ...envelope,
      ttl: envelope.ttl - 1,
      hops: [
        ...envelope.hops,
        {
          nodeId: nodeId,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
