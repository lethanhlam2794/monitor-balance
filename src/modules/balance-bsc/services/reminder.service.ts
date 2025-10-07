import { Injectable, Logger } from '@nestjs/common';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    private discordWebhook: DiscordWebhookService,
  ) {}

  /**
   * Tạo hoặc cập nhật reminder cho user
   */
  async createOrUpdateReminder(
    telegramId: number,
    threshold: number,
    intervalMinutes: number = 15,
  ): Promise<ReminderDocument> {
    try {
      const reminder = await this.reminderModel.findOneAndUpdate(
        { telegramId },
        {
          threshold,
          intervalMinutes,
          isActive: true,
          lastCheckedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      this.logger.log(
        `Reminder created/updated for user ${telegramId}: threshold=${threshold}, interval=${intervalMinutes}min`,
      );
      return reminder;
    } catch (error) {
      this.logger.error('Error creating/updating reminder:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: upsert reminder',
        'Failed to create/update reminder',
        {
          telegramId,
          threshold,
          intervalMinutes,
          error: (error as any)?.message || String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Lấy reminder của user
   */
  async getReminder(telegramId: number): Promise<ReminderDocument | null> {
    try {
      return await this.reminderModel.findOne({ telegramId });
    } catch (error) {
      this.logger.error('Error getting reminder:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: get reminder',
        'Failed to get reminder',
        { telegramId, error: (error as any)?.message || String(error) },
      );
      return null;
    }
  }

  /**
   * Xóa reminder của user
   */
  async deleteReminder(telegramId: number): Promise<boolean> {
    try {
      const result = await this.reminderModel.deleteOne({ telegramId });
      this.logger.log(`Reminder deleted for user ${telegramId}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error('Error deleting reminder:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: delete reminder',
        'Failed to delete reminder',
        { telegramId, error: (error as any)?.message || String(error) },
      );
      return false;
    }
  }

  /**
   * Tắt reminder của user
   */
  async deactivateReminder(telegramId: number): Promise<boolean> {
    try {
      const result = await this.reminderModel.updateOne(
        { telegramId },
        { isActive: false },
      );

      this.logger.log(`Reminder deactivated for user ${telegramId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error('Error deactivating reminder:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: deactivate reminder',
        'Failed to deactivate reminder',
        { telegramId, error: (error as any)?.message || String(error) },
      );
      return false;
    }
  }

  /**
   * Lấy tất cả reminder đang hoạt động
   */
  async getActiveReminders(): Promise<ReminderDocument[]> {
    try {
      return await this.reminderModel.find({ isActive: true });
    } catch (error) {
      this.logger.error('Error getting active reminders:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: get active reminders',
        'Failed to get active reminders',
        { error: (error as any)?.message || String(error) },
      );
      return [];
    }
  }

  /**
   * Cập nhật thời gian kiểm tra cuối
   */
  async updateLastChecked(telegramId: number, balance: string): Promise<void> {
    try {
      await this.reminderModel.updateOne(
        { telegramId },
        {
          lastCheckedAt: new Date(),
          lastBalance: balance,
        },
      );
    } catch (error) {
      this.logger.error('Error updating last checked:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: update last checked',
        'Failed to update last checked',
        {
          telegramId,
          balance,
          error: (error as any)?.message || String(error),
        },
      );
    }
  }

  /**
   * Cập nhật thời gian cảnh báo cuối
   */
  async updateLastAlert(telegramId: number): Promise<void> {
    try {
      await this.reminderModel.updateOne(
        { telegramId },
        {
          lastAlertAt: new Date(),
          $inc: { alertCount: 1 },
        },
      );
    } catch (error) {
      this.logger.error('Error updating last alert:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: update last alert',
        'Failed to update last alert',
        { telegramId, error: (error as any)?.message || String(error) },
      );
    }
  }

  /**
   * Kiểm tra xem có cần gửi cảnh báo không
   */
  async shouldSendAlert(
    telegramId: number,
    currentBalance: number,
  ): Promise<boolean> {
    try {
      const reminder = await this.getReminder(telegramId);
      if (!reminder || !reminder.isActive) {
        return false;
      }

      // Kiểm tra ngưỡng
      if (currentBalance < reminder.threshold) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking alert condition:', error);
      await this.discordWebhook.auditWebhook(
        'DB error: should send alert',
        'Failed to check alert condition',
        { telegramId, error: (error as any)?.message || String(error) },
      );
      return false;
    }
  }
}
