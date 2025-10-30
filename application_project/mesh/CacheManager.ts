/**
 * CacheManager - Prevents duplicate message re-broadcasts in mesh network
 */
export class CacheManager {
  private messageCache = new Set<string>();
  private readonly maxCacheSize = 1000;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Check if message ID has been seen before
   */
  isDuplicate(messageId: string): boolean {
    return this.messageCache.has(messageId);
  }

  /**
   * Add message ID to cache
   */
  addMessage(messageId: string): void {
    // Clean old entries if cache is full
    if (this.messageCache.size >= this.maxCacheSize) {
      this.cleanOldEntries();
    }

    this.messageCache.add(messageId);
    this.cacheTimestamps.set(messageId, Date.now());
  }

  /**
   * Clean expired entries from cache
   */
  private cleanOldEntries(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    this.cacheTimestamps.forEach((timestamp, id) => {
      if (now - timestamp > this.cacheTimeout) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.messageCache.delete(id);
      this.cacheTimestamps.delete(id);
    });
  }

  /**
   * Clear all cached messages
   */
  clear(): void {
    this.messageCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.messageCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}