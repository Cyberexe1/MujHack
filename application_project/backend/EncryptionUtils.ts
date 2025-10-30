import CryptoJS from 'crypto-js';
import { EncryptionResult } from './types';

/**
 * EncryptionUtils - Low-level cryptographic functions
 * Uses crypto-js for React Native compatibility
 */
export class EncryptionUtils {
  /**
   * Generate a random AES key (256-bit)
   */
  static generateAESKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Generate a random IV for AES
   */
  static generateIV(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  /**
   * Encrypt text using AES-256-GCM
   */
  static encryptAES(plaintext: string, key: string): EncryptionResult {
    try {
      const iv = this.generateIV();
      const keyWordArray = CryptoJS.enc.Hex.parse(key);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);

      // Use AES-256-CBC (GCM not directly available in crypto-js)
      const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Generate authentication tag (HMAC for integrity)
      const tag = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), keyWordArray).toString();

      return {
        ciphertext: encrypted.ciphertext.toString(),
        iv,
        tag
      };
    } catch (error) {
      console.error('AES encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   */
  static decryptAES(ciphertext: string, key: string, iv: string, tag: string): string {
    try {
      const keyWordArray = CryptoJS.enc.Hex.parse(key);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);

      // Verify authentication tag
      const expectedTag = CryptoJS.HmacSHA256(ciphertext, keyWordArray).toString();
      if (expectedTag !== tag) {
        throw new Error('Authentication tag verification failed');
      }

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(ciphertext) } as any,
        keyWordArray,
        {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('AES decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate RSA key pair (mock implementation for React Native)
   * In production, use react-native-rsa-native or similar
   */
  static generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    // Mock RSA key generation for development
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    
    return {
      publicKey: `RSA_PUB_${timestamp}_${random}`,
      privateKey: `RSA_PRIV_${timestamp}_${random}`
    };
  }

  /**
   * Encrypt AES key using RSA public key (mock implementation)
   */
  static encryptRSA(aesKey: string, publicKey: string): string {
    try {
      // Mock RSA encryption - in production, use actual RSA
      const combined = `${aesKey}:${publicKey}`;
      return CryptoJS.AES.encrypt(combined, 'mock-rsa-key').toString();
    } catch (error) {
      console.error('RSA encryption failed:', error);
      throw new Error('RSA encryption failed');
    }
  }

  /**
   * Decrypt AES key using RSA private key (mock implementation)
   */
  static decryptRSA(encryptedKey: string, privateKey: string): string {
    try {
      // Mock RSA decryption - in production, use actual RSA
      const decrypted = CryptoJS.AES.decrypt(encryptedKey, 'mock-rsa-key').toString(CryptoJS.enc.Utf8);
      const [aesKey] = decrypted.split(':');
      return aesKey;
    } catch (error) {
      console.error('RSA decryption failed:', error);
      throw new Error('RSA decryption failed');
    }
  }

  /**
   * Create digital signature (mock implementation)
   */
  static signData(data: string, privateKey: string): string {
    try {
      // Mock digital signature
      const hash = CryptoJS.SHA256(data + privateKey).toString();
      return hash.substring(0, 32);
    } catch (error) {
      console.error('Signing failed:', error);
      throw new Error('Signing failed');
    }
  }

  /**
   * Verify digital signature (mock implementation)
   */
  static verifySignature(data: string, signature: string, publicKey: string): boolean {
    try {
      // Mock signature verification
      // In production, derive private key relationship from public key
      const mockPrivateKey = publicKey.replace('PUB', 'PRIV');
      const expectedSignature = this.signData(data, mockPrivateKey);
      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random bytes as hex string
   */
  static randomBytes(length: number): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Hash data using SHA-256
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}