import { CryptoUtils } from './crypto';
import { AdminKeyStore } from '../services/adminKeyStore';
import { AdminKeyPair } from '../types/message';

export class AdminKeyGenerator {
  static async generateAndStoreAdminKeys(): Promise<AdminKeyPair> {
    const keyPair = await CryptoUtils.generateAdminKeyPair();
    AdminKeyStore.saveAdminKeyPair(keyPair);
    return keyPair;
  }

  static async initializeAdminMode(): Promise<AdminKeyPair> {
    if (AdminKeyStore.hasAdminKeys()) {
      const stored = AdminKeyStore.getAdminKeyPair();
      if (stored) {
        AdminKeyStore.setAdminMode(true);
        return stored;
      }
    }

    return this.generateAndStoreAdminKeys();
  }

  static getPublicKeyForSharing(): string | null {
    return AdminKeyStore.getAdminPublicKey();
  }

  static resetAdminKeys(): void {
    AdminKeyStore.clearAdminKeys();
  }

  static isAdminInitialized(): boolean {
    return AdminKeyStore.isAdminMode() && AdminKeyStore.hasAdminKeys();
  }
}
