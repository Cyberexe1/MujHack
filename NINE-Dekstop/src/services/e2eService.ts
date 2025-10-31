import { MessageEnvelope, KeyEnvelope, DecryptedMessage, MessageMeta } from '../types/message';
import { CryptoUtils } from '../utils/crypto';
import { MessageFactory } from './messageFactory';
import { MessageStore } from './messageStore';
import { MeshNetwork } from './meshNetwork';
import { AdminKeyStore } from './adminKeyStore';

export class E2EService {
  private meshNetwork: MeshNetwork;

  constructor() {
    this.meshNetwork = MeshNetwork.getInstance();
    // Initialize if not already done
    this.meshNetwork.initialize().catch(console.error);
    this.setupMessageListeners();
  }

  private setupMessageListeners(): void {
    this.meshNetwork.onMessage((message) => {
      if (message.type === 'e2e' && AdminKeyStore.isAdminMode()) {
        this.tryDecryptMessage(message);
      }
    });

    this.meshNetwork.onKeyEnvelope((key) => {
      if (AdminKeyStore.isAdminMode()) {
        this.tryDecryptMessage(undefined, key);
      }
    });
  }

  async createE2EMessage(
    content: string,
    meta?: MessageMeta
  ): Promise<{ messageEnvelope: MessageEnvelope; keyEnvelope: KeyEnvelope }> {
    const adminPublicKey = AdminKeyStore.getAdminPublicKey();
    if (!adminPublicKey) {
      throw new Error('Admin public key not available');
    }

    await CryptoUtils.initialize();

    const sessionKey = CryptoUtils.generateSessionKey();
    const encryptedPayload = await CryptoUtils.encryptMessage(content, sessionKey);

    const messageEnvelope = MessageFactory.createE2EMessageEnvelope(
      encryptedPayload,
      meta
    );

    const wrappedKey = await CryptoUtils.wrapSessionKey(sessionKey, adminPublicKey);
    const keyEnvelope = MessageFactory.createKeyEnvelope(messageEnvelope.msg_id, wrappedKey);

    MessageStore.saveMessageEnvelope(messageEnvelope);
    MessageStore.saveKeyEnvelope(keyEnvelope);

    this.meshNetwork.broadcastMessage(messageEnvelope);
    this.meshNetwork.broadcastKeyEnvelope(keyEnvelope);

    return { messageEnvelope, keyEnvelope };
  }

  private async tryDecryptMessage(
    messageEnvelope?: MessageEnvelope,
    keyEnvelope?: KeyEnvelope
  ): Promise<void> {
    if (!messageEnvelope && !keyEnvelope) {
      return;
    }

    const msgId = messageEnvelope?.msg_id || keyEnvelope?.msg_id;
    if (!msgId) {
      return;
    }

    const storedMessage = MessageStore.getMessageEnvelopeById(msgId);
    const storedKey = MessageStore.getKeyEnvelopeById(msgId);

    if (!storedMessage || !storedKey) {
      return;
    }

    if (storedMessage.type !== 'e2e' || storedKey.to !== 'admin') {
      return;
    }

    try {
      await CryptoUtils.initialize();
      const adminPrivateKey = AdminKeyStore.getAdminPrivateKey();
      if (!adminPrivateKey) {
        throw new Error('Admin private key not available');
      }

      const sessionKey = await CryptoUtils.unwrapSessionKey(
        storedKey.wrapped_key,
        adminPrivateKey
      );

      const decryptedContent = await CryptoUtils.decryptMessage(
        storedMessage.payload,
        sessionKey
      );

      const decryptedMessage: DecryptedMessage = {
        msg_id: msgId,
        content: decryptedContent,
        timestamp: storedMessage.timestamp,
        from: storedMessage.from,
        meta: storedMessage.meta,
        messagePath: storedMessage.hops,
        keyPath: [{ nodeId: storedKey.from, timestamp: new Date().toISOString() }],
      };

      MessageStore.saveDecryptedMessage(decryptedMessage);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  }

  getDecryptedMessages(): DecryptedMessage[] {
    if (!AdminKeyStore.isAdminMode()) {
      return [];
    }
    return MessageStore.getDecryptedMessages().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getDecryptedMessageById(msgId: string): DecryptedMessage | undefined {
    return this.getDecryptedMessages().find((msg) => msg.msg_id === msgId);
  }

  getE2EMessageEnvelopes(): MessageEnvelope[] {
    return MessageStore.getMessageEnvelopes().filter((msg) => msg.type === 'e2e');
  }

  canDecryptMessages(): boolean {
    return AdminKeyStore.isAdminMode() && AdminKeyStore.hasAdminKeys();
  }

  getMessagePathForId(msgId: string): string[] {
    const message = MessageStore.getMessageEnvelopeById(msgId);
    return message?.hops.map((hop) => hop.nodeId) || [];
  }

  getKeyPathForId(msgId: string): string[] {
    const keyEnvelope = MessageStore.getKeyEnvelopeById(msgId);
    return keyEnvelope ? [keyEnvelope.from] : [];
  }
}
