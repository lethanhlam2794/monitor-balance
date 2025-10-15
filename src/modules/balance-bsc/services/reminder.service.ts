import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
  ) {}

  /**
   * Create or update reminder for user
   */
  async createOrUpdateReminder(
    telegramId: number,
    threshold: number,
    intervalMinutes: number = 15
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
        { upsert: true, new: true }
      );

      this.logger.log(`Reminder created/updated for user ${telegramId}: threshold=${threshold}, interval=${intervalMinutes}min`);
      return reminder;
    } catch (error) {
      this.logger.error('Error creating/updating reminder:', error);
      throw error;
    }
  }

  /**
   * Get user's reminder
   */
  async getReminder(telegramId: number): Promise<ReminderDocument | null> {
    try {
      return await this.reminderModel.findOne({ telegramId });
    } catch (error) {
      this.logger.error('Error getting reminder:', error);
      return null;
    }
  }

  /**
   * Delete user's reminder
   */
  async deleteReminder(telegramId: number): Promise<boolean> {
    try {
      const result = await this.reminderModel.deleteOne({ telegramId });
      this.logger.log(`Reminder deleted for user ${telegramId}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error('Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Turn off user's reminder
   */
  async deactivateReminder(telegramId: number): Promise<boolean> {
    try {
      const result = await this.reminderModel.updateOne(
        { telegramId },
        { isActive: false }
      );
      
      this.logger.log(`Reminder deactivated for user ${telegramId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error('Error deactivating reminder:', error);
      return false;
    }
  }

  /**
   * Get all active reminders
   */
  async getActiveReminders(): Promise<ReminderDocument[]> {
    try {
      return await this.reminderModel.find({ isActive: true });
    } catch (error) {
      this.logger.error('Error getting active reminders:', error);
      return [];
    }
  }

  /**
   * Update last check time
   */
  async updateLastChecked(telegramId: number, balance: string): Promise<void> {
    try {
      await this.reminderModel.updateOne(
        { telegramId },
        { 
          lastCheckedAt: new Date(),
          lastBalance: balance
        }
      );
    } catch (error) {
      this.logger.error('Error updating last checked:', error);
    }
  }

  /**
   * Update last alert time
   */
  async updateLastAlert(telegramId: number): Promise<void> {
    try {
      await this.reminderModel.updateOne(
        { telegramId },
        { 
          lastAlertAt: new Date(),
          $inc: { alertCount: 1 }
        }
      );
    } catch (error) {
      this.logger.error('Error updating last alert:', error);
    }
  }

  /**
   * Check if alert needs to be sent
   */
  async shouldSendAlert(telegramId: number, currentBalance: number): Promise<boolean> {
    try {
      const reminder = await this.getReminder(telegramId);
      if (!reminder || !reminder.isActive) {
        return false;
      }

      // Check threshold
      if (currentBalance < reminder.threshold) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking alert condition:', error);
      return false;
    }
  }
}
