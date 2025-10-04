import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ReminderService } from '../../balance-bsc/services/reminder.service';
import { ConfigService } from '@nestjs/config';
import { BalanceMonitoringJobData } from '../queues/balance-monitoring.queue';

@Injectable()
export class BalanceMonitoringQueueService {
  private readonly logger = new Logger(BalanceMonitoringQueueService.name);

  constructor(
    @InjectQueue('balance-monitoring')
    private balanceMonitoringQueue: Queue,
    private reminderService: ReminderService,
    private configService: ConfigService,
  ) {}

  /**
   * Tạo job cho user mới
   */
  async scheduleUserReminder(
    telegramId: number,
    threshold: number,
    intervalMinutes: number
  ): Promise<void> {
    try {
      // Lưu reminder vào database
      await this.reminderService.createOrUpdateReminder(telegramId, threshold, intervalMinutes);

      // Xóa job cũ nếu có
      await this.removeUserJobs(telegramId);

      // Tạo job mới với delay
      const jobData: BalanceMonitoringJobData = {
        telegramId,
        threshold,
        walletAddress: this.configService.get<string>('ADDRESS_BUY_CARD') || '',
        contractAddress: this.configService.get<string>('CONTRACT_ADDRESS_USDT') || '',
        chainId: 56, // BSC
      };

      // Tạo job với repeat pattern
      const job = await this.balanceMonitoringQueue.add(
        'check-balance',
        jobData,
        {
          repeat: {
            every: intervalMinutes * 60 * 1000, // Convert to milliseconds
          },
          jobId: `balance-${telegramId}`, // Unique job ID
          removeOnComplete: 10, // Keep last 10 completed jobs
          removeOnFail: 5, // Keep last 5 failed jobs
        }
      );

      this.logger.log(`Scheduled reminder for user ${telegramId}: every ${intervalMinutes} minutes`);
    } catch (error) {
      this.logger.error(`Error scheduling reminder for user ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Xóa job của user
   */
  async removeUserReminder(telegramId: number): Promise<void> {
    try {
      // Xóa khỏi database
      await this.reminderService.deleteReminder(telegramId);

      // Xóa job khỏi queue
      await this.removeUserJobs(telegramId);

      this.logger.log(`Removed reminder for user ${telegramId}`);
    } catch (error) {
      this.logger.error(`Error removing reminder for user ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Xóa tất cả jobs của user
   */
  private async removeUserJobs(telegramId: number): Promise<void> {
    try {
      const jobs = await this.balanceMonitoringQueue.getJobs(['waiting', 'delayed', 'active']);
      
      for (const job of jobs) {
        if (job.data.telegramId === telegramId) {
          await job.remove();
          this.logger.log(`Removed job for user ${telegramId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error removing jobs for user ${telegramId}:`, error);
    }
  }

  /**
   * Khởi tạo lại tất cả reminders từ database
   */
  async initializeReminders(): Promise<void> {
    try {
      this.logger.log('Initializing reminders from database...');
      
      const activeReminders = await this.reminderService.getActiveReminders();
      
      for (const reminder of activeReminders) {
        await this.scheduleUserReminder(
          reminder.telegramId,
          reminder.threshold,
          reminder.intervalMinutes
        );
      }
      
      this.logger.log(`Initialized ${activeReminders.length} reminders`);
    } catch (error) {
      this.logger.error('Error initializing reminders:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin queue
   */
  async getQueueInfo(): Promise<any> {
    const waiting = await this.balanceMonitoringQueue.getWaiting();
    const active = await this.balanceMonitoringQueue.getActive();
    const completed = await this.balanceMonitoringQueue.getCompleted();
    const failed = await this.balanceMonitoringQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
