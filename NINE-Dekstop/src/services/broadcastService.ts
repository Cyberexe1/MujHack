import { MessageEnvelope, MessageMeta } from '../types/message';
import { MessageFactory } from './messageFactory';
import { MessageStore } from './messageStore';
import { MeshNetwork } from './meshNetwork';

export class BroadcastService {
  private meshNetwork: MeshNetwork;

  constructor() {
    this.meshNetwork = MeshNetwork.getInstance();
    // Initialize if not already done
    this.meshNetwork.initialize().catch(console.error);
  }

  async createBroadcast(
    content: string,
    meta?: MessageMeta
  ): Promise<MessageEnvelope> {
    const message = MessageFactory.createBroadcastMessage(content, meta);

    MessageStore.saveBroadcast(message);
    this.meshNetwork.broadcastMessage(message);

    return message;
  }

  getBroadcasts(): MessageEnvelope[] {
    return MessageStore.getBroadcasts();
  }

  getBroadcastById(msgId: string): MessageEnvelope | undefined {
    return this.getBroadcasts().find((msg) => msg.msg_id === msgId);
  }

  getAllBroadcastsSorted(): MessageEnvelope[] {
    return this.getBroadcasts().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getBroadcastsWithinLastMinutes(minutes: number): MessageEnvelope[] {
    const now = Date.now();
    const cutoff = now - minutes * 60 * 1000;

    return this.getAllBroadcastsSorted().filter(
      (msg) => new Date(msg.timestamp).getTime() > cutoff
    );
  }
}
