import { MessageEnvelope, KeyEnvelope, DecryptedMessage } from '../types/message';

export class MessageStore {
  private static readonly BROADCAST_KEY = 'nine_broadcasts';
  private static readonly MESSAGE_MESH_KEY = 'nine_message_mesh';
  private static readonly KEY_MESH_KEY = 'nine_key_mesh';
  private static readonly DECRYPTED_KEY = 'nine_decrypted';
  private static readonly DEDUPE_KEY = 'nine_dedupe';

  static saveBroadcast(message: MessageEnvelope): void {
    const broadcasts = this.getBroadcasts();
    broadcasts.push(message);
    this.saveToStorage(this.BROADCAST_KEY, broadcasts);
  }

  static getBroadcasts(): MessageEnvelope[] {
    return this.loadFromStorage(this.BROADCAST_KEY) || [];
  }

  static saveMessageEnvelope(message: MessageEnvelope): void {
    const messages = this.getMessageEnvelopes();
    messages.push(message);
    this.saveToStorage(this.MESSAGE_MESH_KEY, messages);
  }

  static getMessageEnvelopes(): MessageEnvelope[] {
    return this.loadFromStorage(this.MESSAGE_MESH_KEY) || [];
  }

  static saveKeyEnvelope(key: KeyEnvelope): void {
    const keys = this.getKeyEnvelopes();
    keys.push(key);
    this.saveToStorage(this.KEY_MESH_KEY, keys);
  }

  static getKeyEnvelopes(): KeyEnvelope[] {
    return this.loadFromStorage(this.KEY_MESH_KEY) || [];
  }

  static saveDecryptedMessage(message: DecryptedMessage): void {
    const decrypted = this.getDecryptedMessages();
    decrypted.push(message);
    this.saveToStorage(this.DECRYPTED_KEY, decrypted);
  }

  static getDecryptedMessages(): DecryptedMessage[] {
    return this.loadFromStorage(this.DECRYPTED_KEY) || [];
  }

  static isDuplicate(msgId: string): boolean {
    const dedupe = this.getDedupe();
    return dedupe.includes(msgId);
  }

  static markAsProcessed(msgId: string): void {
    const dedupe = this.getDedupe();
    if (!dedupe.includes(msgId)) {
      dedupe.push(msgId);
      if (dedupe.length > 1000) {
        dedupe.shift();
      }
      this.saveToStorage(this.DEDUPE_KEY, dedupe);
    }
  }

  private static getDedupe(): string[] {
    return this.loadFromStorage(this.DEDUPE_KEY) || [];
  }

  private static saveToStorage<T>(key: string, data: T): void {
    try {
      const jsonString = JSON.stringify(data);
      localStorage.setItem(key, jsonString);
    } catch (error) {
      console.error(`Failed to save to storage (${key}):`, error);
    }
  }

  private static loadFromStorage<T>(key: string): T | null {
    try {
      const jsonString = localStorage.getItem(key);
      if (!jsonString) return null;
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`Failed to load from storage (${key}):`, error);
      return null;
    }
  }

  static clearAll(): void {
    localStorage.removeItem(this.BROADCAST_KEY);
    localStorage.removeItem(this.MESSAGE_MESH_KEY);
    localStorage.removeItem(this.KEY_MESH_KEY);
    localStorage.removeItem(this.DECRYPTED_KEY);
    localStorage.removeItem(this.DEDUPE_KEY);
  }

  static exportData(): string {
    const data = {
      broadcasts: this.getBroadcasts(),
      messageMesh: this.getMessageEnvelopes(),
      keyMesh: this.getKeyEnvelopes(),
      decrypted: this.getDecryptedMessages(),
    };
    return JSON.stringify(data, null, 2);
  }

  static getMessageEnvelopeById(msgId: string): MessageEnvelope | undefined {
    return this.getMessageEnvelopes().find((msg) => msg.msg_id === msgId);
  }

  static getKeyEnvelopeById(msgId: string): KeyEnvelope | undefined {
    return this.getKeyEnvelopes().find((key) => key.msg_id === msgId);
  }
}
