import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MasterFundVinachainService } from '../../masterfund-vinachain/services/masterfund-vinachain.service';
import { BotService } from '../../bot-telegram/bot.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/enums/user-role.enum';
import { escapeMarkdownV2, formatNumber } from '@shared/message_builder';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

interface MasterFundReminder {
  telegramId: number;
  threshold: number;
  intervalMinutes: number;
  lastCheckedAt?: Date;
  isActive: boolean;
}

@Injectable()
export class MasterFundMonitoringService {
  private readonly logger = new Logger(MasterFundMonitoringService.name);
  private masterFundReminders: Map<number, MasterFundReminder> = new Map();

  constructor(
    private masterFundVinachainService: MasterFundVinachainService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.debug('Fetching Master Fund data...');

    try {
      const result = await this.masterFundVinachainService.getMasterFundInfo();
      const masterFundData = result.success ? result.data : null;

      if (masterFundData) {
        this.logger.log(
          `Master Fund data fetched: ${masterFundData.balance} USDT`,
        );

        await this.cacheManager.set(
          'master_fund_balance',
          masterFundData,
          35 * 60 * 1000, // TTL 35 minutes
        );

        setTimeout(
          async () => {
            await this.sendMasterFundNotificationsToUsers(masterFundData);
          },
          5 * 60 * 1000, // 5 minutes delay
        );
      }
    } catch (error) {
      this.logger.error('Error fetching Master Fund data:', error);
    }
  }

  async addMasterFundReminder(
    telegramId: number,
    threshold: number,
    intervalMinutes: number,
  ): Promise<boolean> {
    // Validate input
    if (isNaN(threshold) || threshold < 0) {
      return false;
    }

    if (
      isNaN(intervalMinutes) ||
      intervalMinutes < 5 ||
      intervalMinutes > 1440
    ) {
      return false;
    }

    // Check if user exists
    const user = await this.authService.findByTelegramId(telegramId);
    if (!user) {
      return false;
    }

    if (threshold === 0) {
      // Disable reminder
      this.masterFundReminders.delete(telegramId);
      this.logger.log(`Master Fund reminder disabled for user ${telegramId}`);
      return true;
    }

    // Add or update reminder
    this.masterFundReminders.set(telegramId, {
      telegramId,
      threshold,
      intervalMinutes,
      isActive: true,
      lastCheckedAt: undefined,
    });

    this.logger.log(
      `Master Fund reminder set for user ${telegramId}: threshold ${threshold}, interval ${intervalMinutes} minutes`,
    );
    return true;
  }

  private async checkAndSendMasterFundAlert(
    telegramId: number,
    threshold: number,
  ): Promise<void> {
    try {
      const result = await this.masterFundVinachainService.getMasterFundInfo();

      if (result.success && result.data) {
        const balance = result.data.balance;

        if (balance < threshold) {
          const user = await this.authService.findByTelegramId(telegramId);
          const userRole = user?.role;

          const alertMessage = this.buildMasterFundAlertMessage(
            balance,
            result.data.currency,
            threshold,
          );

          const walletAddress =
            result.data.wallets && result.data.wallets.length > 0
              ? result.data.wallets[0].address
              : 'N/A';
          const keyboard = this.buildCopyAddressKeyboard(walletAddress);
          await this.botService.sendMessageWithKeyboard(
            telegramId,
            alertMessage,
            keyboard,
          );
          this.logger.warn(
            `Master Fund alert sent to user ${telegramId}: Balance (${balance}) below threshold (${threshold})`,
          );
        } else {
          this.logger.log(
            `Master Fund balance for user ${telegramId} is ${balance}, which is above threshold ${threshold}. No alert sent.`,
          );
        }
      } else {
        this.logger.error(
          `Failed to fetch Master Fund info for user ${telegramId}.`,
        );
        await this.botService.sendMessage(
          telegramId,
          'Error fetching Master Fund information.',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error checking Master Fund for user ${telegramId}:`,
        error,
      );
    }
  }

  private async sendMasterFundNotificationsToUsers(
    masterFundData: any,
  ): Promise<void> {
    try {
      this.logger.debug('Sending Master Fund notifications to users...');

      for (const [telegramId, reminder] of this.masterFundReminders) {
        if (!reminder.isActive) continue;

        const balance = parseFloat(masterFundData.balance);

        if (balance < reminder.threshold) {
          const alertMessage = this.buildMasterFundAlertMessage(
            balance,
            'USDT',
            reminder.threshold,
          );

          await this.botService.sendMessage(telegramId, alertMessage);
          reminder.lastCheckedAt = new Date();

          this.logger.warn(
            `Master Fund alert sent to user ${telegramId}: Balance (${balance}) below threshold (${reminder.threshold})`,
          );
        } else {
          this.logger.log(
            `Master Fund balance for user ${telegramId} is ${balance}, which is above threshold ${reminder.threshold}. No alert sent.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error sending Master Fund notifications to users:',
        error,
      );
    }
  }

  private buildMasterFundAlertMessage(
    balance: number,
    currency: string,
    threshold: number,
  ): string {
    const title = escapeMarkdownV2('Master Fund Alert!');
    const balanceLabel = escapeMarkdownV2('Current Balance:');
    const thresholdLabel = escapeMarkdownV2('Alert Threshold:');
    const footer = escapeMarkdownV2('Balance is below the set threshold.');

    return `*${title}*

*${balanceLabel}* ${escapeMarkdownV2(formatNumber(balance))} ${escapeMarkdownV2(currency)}
*${thresholdLabel}* ${escapeMarkdownV2(formatNumber(threshold))} ${escapeMarkdownV2(currency)}

${footer}`;
  }

  private buildCopyAddressKeyboard(walletAddress: string) {
    return {
      inline_keyboard: [
        [
          {
            text: '📋 Copy wallet address',
            url: `https://t.me/share/url?url=${encodeURIComponent(walletAddress)}`,
          },
        ],
      ],
    };
  }
}
