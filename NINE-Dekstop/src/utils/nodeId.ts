export class NodeIdGenerator {
  private static nodeId: string | null = null;

  static getOrCreateNodeId(): string {
    if (this.nodeId) {
      return this.nodeId;
    }

    let storedId = localStorage.getItem('nine_node_id');
    if (!storedId) {
      storedId = this.generateNodeId();
      localStorage.setItem('nine_node_id', storedId);
    }

    this.nodeId = storedId;
    return storedId;
  }

  private static generateNodeId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  static getPseudoId(): string {
    return `user_${this.getOrCreateNodeId().substring(0, 8)}`;
  }
}
