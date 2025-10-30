import { v4 as uuidv4 } from 'uuid';
import { EncryptionUtils } from './EncryptionUtils';
import { KeyManager } from './KeyManager';
import { EncryptedMessage } from './types';
import { MeshMessage } from '@/mesh/types';

/**
 * MessageEncryptor - Handles end-to-end message encryption and decryption
 */
export class MessageEncryptor {
  private keyManager: KeyManager;

  constructor() {
    this.keyManager = KeyManager.getInstance();
  }

  /**
   * Encrypt a message for transmission
   */
  async encryptMessage(
    payload: string,
    mode: 'BROADCAST' | 'SECURE',
    fromDeviceId: string,
    toDeviceId?: string
  ): Promise<EncryptedMessage> {
    try {
      const messageId = uuidv4();
      const timestamp = Date.now();

      if (mode === 'BROADCAST') {
        // For broadcast messages, use simple encryption with a shared key
        const aesKey = EncryptionUtils.generateAESKey();
        const encrypted = EncryptionUtils.encryptAES(payload, aesKey);

        return {
          id: messageId,
          from: fromDeviceId,
          to: 'all',
          mode,
          timestamp,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          tag: encrypted.tag,
          // Store AES key in plaintext for broadcast (or use a known shared key)
          encryptedKey: aesKey,
        };
      } else {
        // For secure messages, use RSA + AES encryption
        if (!toDeviceId) {
          throw new Error('Target device ID required for secure messages');
        }

        const recipientPublicKey = this.keyManager.getPeerKey(toDeviceId);
        if (!recipientPublicKey) {
          throw new Error(`No public key found for device: ${toDeviceId}`);
        }

        // Generate AES key and encrypt message
        const aesKey = EncryptionUtils.generateAESKey();
        const encrypted = EncryptionUtils.encryptAES(payload, aesKey);

        // Encrypt AES key with recipient's public key
        const encryptedKey = EncryptionUtils.encryptRSA(aesKey, recipientPublicKey);

        // Create digital signature
        const dataToSign = `${messageId}:${payload}:${timestamp}`;
        const signature = EncryptionUtils.signData(dataToSign, this.keyManager.getPrivateKey());

        return {
          id: messageId,
          from: fromDeviceId,
          to: toDeviceId,
          mode,
          timestamp,
          encryptedKey,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          tag: encrypted.tag,
          signature,
        };
      }
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt a received message
   */
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string> {
    try {
      if (encryptedMessage.mode === 'BROADCAST') {
        // For broadcast messages, AES key is stored in encryptedKey field
        const aesKey = encryptedMessage.encryptedKey!;
        
        return EncryptionUtils.decryptAES(
          encryptedMessage.ciphertext,
          aesKey,
          encryptedMessage.iv,
          encryptedMessage.tag
        );
      } else {
        // For secure messages, decrypt AES key first
        if (!encryptedMessage.encryptedKey) {
          throw new Error('No encrypted key found in secure message');
        }

        // Decrypt AES key using our private key
        const aesKey = EncryptionUtils.decryptRSA(
          encryptedMessage.encryptedKey,
          this.keyManager.getPrivateKey()
        );

        // Decrypt message payload
        const decryptedPayload = EncryptionUtils.decryptAES(
          encryptedMessage.ciphertext,
          aesKey,
          encryptedMessage.iv,
          encryptedMessage.tag
        );

        // Verify signature if present
        if (encryptedMessage.signature) {
          const senderPublicKey = this.keyManager.getPeerKey(encryptedMessage.from);
          if (senderPublicKey) {
            const dataToVerify = `${encryptedMessage.id}:${decryptedPayload}:${encryptedMessage.timestamp}`;
            const isValid = EncryptionUtils.verifySignature(
              dataToVerify,
              encryptedMessage.signature,
              senderPublicKey
            );

            if (!isValid) {
              console.warn('Message signature verification failed:', encryptedMessage.id);
              // Continue anyway, but log the warning
            } else {
              console.log('Message signature verified successfully');
            }
          } else {
            console.warn('Cannot verify signature: no public key for sender');
          }
        }

        return decryptedPayload;
      }
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw error;
    }
  }

  /**
   * Convert encrypted message to mesh message format
   */
  encryptedToMeshMessage(encryptedMessage: EncryptedMessage): MeshMessage {
    return {
      id: encryptedMessage.id,
      from: encryptedMessage.from,
      to: encryptedMessage.to,
      mode: encryptedMessage.mode,
      timestamp: encryptedMessage.timestamp,
      payload: JSON.stringify({
        encryptedKey: encryptedMessage.encryptedKey,
        ciphertext: encryptedMessage.ciphertext,
        iv: encryptedMessage.iv,
        tag: encryptedMessage.tag,
        signature: encryptedMessage.signature,
      }),
      ack: false,
    };
  }

  /**
   * Convert mesh message to encrypted message format
   */
  meshToEncryptedMessage(meshMessage: MeshMessage): EncryptedMessage {
    try {
      const payload = JSON.parse(meshMessage.payload);
      
      return {
        id: meshMessage.id,
        from: meshMessage.from,
        to: meshMessage.to,
        mode: meshMessage.mode,
        timestamp: meshMessage.timestamp,
        encryptedKey: payload.encryptedKey,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        tag: payload.tag,
        signature: payload.signature,
      };
    } catch (error) {
      console.error('Failed to parse mesh message payload:', error);
      throw new Error('Invalid encrypted message format');
    }
  }

  /**
   * Create an ACK message
   */
  createAckMessage(originalMessageId: string, fromDeviceId: string, toDeviceId: string): MeshMessage {
    return {
      id: uuidv4(),
      from: fromDeviceId,
      to: toDeviceId,
      mode: 'SECURE',
      timestamp: Date.now(),
      payload: `ACK:${originalMessageId}`,
      ack: true,
    };
  }

  /**
   * Check if message is an ACK
   */
  isAckMessage(meshMessage: MeshMessage): boolean {
    return meshMessage.ack && meshMessage.payload.startsWith('ACK:');
  }

  /**
   * Extract original message ID from ACK
   */
  getAckMessageId(ackMessage: MeshMessage): string | null {
    if (!this.isAckMessage(ackMessage)) {
      return null;
    }
    
    return ackMessage.payload.replace('ACK:', '');
  }

  /**
   * Validate message format
   */
  validateEncryptedMessage(message: any): message is EncryptedMessage {
    return (
      typeof message.id === 'string' &&
      typeof message.from === 'string' &&
      typeof message.to === 'string' &&
      ['BROADCAST', 'SECURE'].includes(message.mode) &&
      typeof message.timestamp === 'number' &&
      typeof message.ciphertext === 'string' &&
      typeof message.iv === 'string' &&
      typeof message.tag === 'string'
    );
  }

  /**
   * Get encryption statistics
   */
  getStats() {
    return {
      keyManagerStats: this.keyManager.getStats(),
      supportedModes: ['BROADCAST', 'SECURE'],
      encryptionAlgorithm: 'AES-256-CBC + RSA',
    };
  }
}