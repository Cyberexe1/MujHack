import sodium from 'libsodium-wrappers';
import { AdminKeyPair } from '../types/message';

export class CryptoUtils {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  static async generateAdminKeyPair(): Promise<AdminKeyPair> {
    await this.initialize();
    const keypair = sodium.crypto_box_keypair();
    return {
      publicKey: sodium.to_base64(keypair.publicKey),
      privateKey: sodium.to_base64(keypair.privateKey),
    };
  }

  static async generateEphemeralKeyPair(deviceId: string): Promise<AdminKeyPair> {
    await this.initialize();
    const timestamp = Date.now().toString();
    const randomSeed = sodium.randombytes_buf(16);
    const salt = new TextEncoder().encode(`${deviceId}${timestamp}`);

    const combinedSeed = new Uint8Array(salt.length + randomSeed.length);
    combinedSeed.set(salt);
    combinedSeed.set(randomSeed, salt.length);

    const seed = sodium.crypto_generichash(32, combinedSeed);
    const keypair = sodium.crypto_box_seed_keypair(seed);

    return {
      publicKey: sodium.to_base64(keypair.publicKey),
      privateKey: sodium.to_base64(keypair.privateKey),
    };
  }

  static async encryptMessage(message: string, sessionKey: Uint8Array): Promise<string> {
    await this.initialize();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const messageBytes = new TextEncoder().encode(message);
    const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, sessionKey);

    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);

    return sodium.to_base64(combined);
  }

  static async decryptMessage(encryptedMessage: string, sessionKey: Uint8Array): Promise<string> {
    await this.initialize();
    const combined = sodium.from_base64(encryptedMessage);
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, sessionKey);
    return new TextDecoder().decode(decrypted);
  }

  static async wrapSessionKey(sessionKey: Uint8Array, adminPublicKey: string): Promise<string> {
    await this.initialize();
    const ephemeralKeypair = sodium.crypto_box_keypair();
    const adminPubKeyBytes = sodium.from_base64(adminPublicKey);

    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const wrapped = sodium.crypto_box_easy(
      sessionKey,
      nonce,
      adminPubKeyBytes,
      ephemeralKeypair.privateKey
    );

    const combined = new Uint8Array(
      ephemeralKeypair.publicKey.length + nonce.length + wrapped.length
    );
    combined.set(ephemeralKeypair.publicKey);
    combined.set(nonce, ephemeralKeypair.publicKey.length);
    combined.set(wrapped, ephemeralKeypair.publicKey.length + nonce.length);

    return sodium.to_base64(combined);
  }

  static async unwrapSessionKey(
    wrappedKey: string,
    adminPrivateKey: string
  ): Promise<Uint8Array> {
    await this.initialize();
    const combined = sodium.from_base64(wrappedKey);
    const ephemeralPublicKey = combined.slice(0, sodium.crypto_box_PUBLICKEYBYTES);
    const nonce = combined.slice(
      sodium.crypto_box_PUBLICKEYBYTES,
      sodium.crypto_box_PUBLICKEYBYTES + sodium.crypto_box_NONCEBYTES
    );
    const ciphertext = combined.slice(
      sodium.crypto_box_PUBLICKEYBYTES + sodium.crypto_box_NONCEBYTES
    );

    const adminPrivKeyBytes = sodium.from_base64(adminPrivateKey);
    const sessionKey = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      ephemeralPublicKey,
      adminPrivKeyBytes
    );

    return sessionKey;
  }

  static generateSessionKey(): Uint8Array {
    return sodium.randombytes_buf(32);
  }
}
