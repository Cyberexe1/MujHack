import { DeliveryStatus } from './types';
import { Database } from './Database';

/**
 * DeliveryManager - Handles message delivery tracking, ACKs, and retries
 */
export class DeliveryManager {
  private static instance: DeliveryManager;
  private pendingMessages = new Map<string, DeliveryStatus>();
  private retryTimers = new Map<string, any>();
  private database: Database;

  // Configuration
  private readonly maxRetries = 3;
  private readonly retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
  private readonly ackTimeout = 15000; // 15 seconds

  private constructor() {
    this.database = Database.getInstance();
  }

  static getInstance(): DeliveryManager {
    if (!DeliveryManager.instance) {
      DeliveryManager.instance = new DeliveryManager();
    }
    return DeliveryManager.instance;
  }

  /**
   * Track a message for delivery confirmation
   */
  trackMessage(
    messageId: string,
    retryCallback?: (messageId: string, attempt: number) => Promise<boolean>
  ): void {
    const status: DeliveryStatus = {
      messageId,
      status: 'pending',
      attempts: 0,
      lastAttempt: Date.now(),
    };

    this.pendingMessages.set(messageId, status);

    // Set timeout for ACK
    const timeout = setTimeout(() => {
      this.handleAckTimeout(messageId, retryCallback);
    }, this.ackTimeout);

    this.retryTimers.set(messageId, timeout);

    console.log(`Tracking message for delivery: ${messageId}`);
  }

  /**
   * Handle ACK timeout - retry or mark as failed
   */
  private async handleAckTimeout(
    messageId: string,
    retryCallback?: (messageId: string, attempt: number) => Promise<boolean>
  ): Promise<void> {
    const status = this.pendingMessages.get(messageId);
    if (!status) {
      return;
    }

    status.attempts++;
    status.lastAttempt = Date.now();

    console.log(`ACK timeout for message ${messageId}, attempt ${status.attempts}`);

    if (status.attempts < this.maxRetries && retryCallback) {
      // Attempt retry
      try {
        const retrySuccess = await retryCallback(messageId, status.attempts);
        
        if (retrySuccess) {
          // Schedule next timeout
          const delay = this.retryDelays[Math.min(status.attempts - 1, this.retryDelays.length - 1)];
          const timeout = setTimeout(() => {
            this.handleAckTimeout(messageId, retryCallback);
          }, delay);

          this.retryTimers.set(messageId, timeout);
          console.log(`Retry scheduled for message ${messageId} in ${delay}ms`);
        } else {
          // Retry failed immediately
          this.markAsFailed(messageId);
        }
      } catch (error) {
        console.error(`Retry failed for message ${messageId}:`, error);
        this.markAsFailed(messageId);
      }
    } else {
      // Max retries reached or no retry callback
      this.markAsFailed(messageId);
    }
  }

  /**
   * Mark message as failed
   */
  private async markAsFailed(messageId: string): Promise<void> {
    const status = this.pendingMessages.get(messageId);
    if (status) {
      status.status = 'failed';
      
      // Update database
      try {
        await this.database.updateDeliveryStatus(messageId, false);
      } catch (error) {
        console.error('Failed to update delivery status in database:', error);
      }

      // Clean up
      this.cleanup(messageId);
      
      console.log(`Message marked as failed: ${messageId}`);
    }
  }

  /**
   * Process received ACK
   */
  async ackReceived(messageId: string): Promise<void> {
    const status = this.pendingMessages.get(messageId);
    if (!status) {
      console.log(`Received ACK for unknown message: ${messageId}`);
      return;
    }

    status.status = 'delivered';
    
    // Update database
    try {
      await this.database.updateDeliveryStatus(messageId, true);
    } catch (error) {
      console.error('Failed to update delivery status in database:', error);
    }

    // Clean up tracking
    this.cleanup(messageId);
    
    console.log(`Message delivered successfully: ${messageId}`);
  }

  /**
   * Clean up tracking for a message
   */
  private cleanup(messageId: string): void {
    // Clear timeout
    const timer = this.retryTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(messageId);
    }

    // Remove from pending
    this.pendingMessages.delete(messageId);
  }

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageId: string): DeliveryStatus | null {
    return this.pendingMessages.get(messageId) || null;
  }

  /**
   * Get all pending messages
   */
  getPendingMessages(): DeliveryStatus[] {
    return Array.from(this.pendingMessages.values());
  }

  /**
   * Cancel tracking for a message
   */
  cancelTracking(messageId: string): void {
    this.cleanup(messageId);
    console.log(`Cancelled tracking for message: ${messageId}`);
  }

  /**
   * Retry a specific message immediately
   */
  async retryMessage(
    messageId: string,
    retryCallback: (messageId: string, attempt: number) => Promise<boolean>
  ): Promise<boolean> {
    const status = this.pendingMessages.get(messageId);
    if (!status) {
      console.error(`Cannot retry unknown message: ${messageId}`);
      return false;
    }

    if (status.attempts >= this.maxRetries) {
      console.error(`Max retries exceeded for message: ${messageId}`);
      return false;
    }

    try {
      status.attempts++;
      status.lastAttempt = Date.now();

      const success = await retryCallback(messageId, status.attempts);
      
      if (success) {
        // Reset timeout for ACK
        this.cleanup(messageId);
        this.trackMessage(messageId, retryCallback);
        console.log(`Manual retry successful for message: ${messageId}`);
      } else {
        console.error(`Manual retry failed for message: ${messageId}`);
      }

      return success;
    } catch (error) {
      console.error(`Manual retry error for message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Get delivery statistics
   */
  getStats() {
    const pending = Array.from(this.pendingMessages.values());
    const delivered = pending.filter(s => s.status === 'delivered').length;
    const failed = pending.filter(s => s.status === 'failed').length;
    const inProgress = pending.filter(s => s.status === 'pending').length;

    return {
      totalTracked: pending.length,
      delivered,
      failed,
      inProgress,
      maxRetries: this.maxRetries,
      ackTimeout: this.ackTimeout,
    };
  }

  /**
   * Clean up old completed deliveries
   */
  cleanupOldDeliveries(olderThanMs: number = 60000): void {
    const cutoff = Date.now() - olderThanMs;
    const toRemove: string[] = [];

    this.pendingMessages.forEach((status, messageId) => {
      if (status.status !== 'pending' && status.lastAttempt < cutoff) {
        toRemove.push(messageId);
      }
    });

    toRemove.forEach(messageId => {
      this.cleanup(messageId);
    });

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} old delivery records`);
    }
  }

  /**
   * Clear all tracking (for reset/debugging)
   */
  clearAll(): void {
    // Clear all timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    
    // Clear maps
    this.pendingMessages.clear();
    this.retryTimers.clear();
    
    console.log('All delivery tracking cleared');
  }
}