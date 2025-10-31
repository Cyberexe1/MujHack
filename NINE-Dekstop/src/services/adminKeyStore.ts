import { AdminKeyPair } from '../types/message';

const ADMIN_PRIVATE_KEY_STORAGE = 'nine_admin_private_key';
const ADMIN_PUBLIC_KEY_STORAGE = 'nine_admin_public_key';
const ADMIN_MODE_STORAGE = 'nine_is_admin';

export class AdminKeyStore {
  static setAdminMode(isAdmin: boolean): void {
    localStorage.setItem(ADMIN_MODE_STORAGE, JSON.stringify(isAdmin));
  }

  static isAdminMode(): boolean {
    const value = localStorage.getItem(ADMIN_MODE_STORAGE);
    return value ? JSON.parse(value) : false;
  }

  static saveAdminKeyPair(keyPair: AdminKeyPair): void {
    localStorage.setItem(ADMIN_PRIVATE_KEY_STORAGE, keyPair.privateKey);
    localStorage.setItem(ADMIN_PUBLIC_KEY_STORAGE, keyPair.publicKey);
    this.setAdminMode(true);
  }

  static getAdminPrivateKey(): string | null {
    return localStorage.getItem(ADMIN_PRIVATE_KEY_STORAGE);
  }

  static getAdminPublicKey(): string | null {
    return localStorage.getItem(ADMIN_PUBLIC_KEY_STORAGE);
  }

  static getAdminKeyPair(): AdminKeyPair | null {
    const privateKey = this.getAdminPrivateKey();
    const publicKey = this.getAdminPublicKey();

    if (!privateKey || !publicKey) {
      return null;
    }

    return { privateKey, publicKey };
  }

  static hasAdminKeys(): boolean {
    return this.getAdminPrivateKey() !== null && this.getAdminPublicKey() !== null;
  }

  static clearAdminKeys(): void {
    localStorage.removeItem(ADMIN_PRIVATE_KEY_STORAGE);
    localStorage.removeItem(ADMIN_PUBLIC_KEY_STORAGE);
    this.setAdminMode(false);
  }

  static exportAdminPublicKey(): string | null {
    return this.getAdminPublicKey();
  }
}
