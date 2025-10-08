import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../../balance-bsc/services/reminder.service';
import { EtherscanService } from '../../balance-bsc/etherscan.service';
import { BotService } from '../../bot-telegram/bot.service';
import { ConfigService } from '@nestjs/config';
import {
  MessageBuilder,
  escapeMarkdownV2,
  formatNumber,
} from '@shared/message_builder';
import { getMessage, BotMessages } from '@shared/enums/bot-messages.enum';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class BalanceMonitoringService {
  private readonly logger = new Logger(BalanceMonitoringService.name);
  private readonly ADDRESS_BUY_CARD: string;
  private readonly CONTRACT_ADDRESS_USDT: string;
  private apiErrorCount = 0;
  private lastApiErrorTime: Date | null = null;

  constructor(
    private reminderService: ReminderService,
    private etherscanService: EtherscanService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private configService: ConfigService,
    private discordWebhookService: DiscordWebhookService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.ADDRESS_BUY_CARD =
      this.configService.get<string>('ADDRESS_BUY_CARD') || '';
    this.CONTRACT_ADDRESS_USDT =
      this.configService.get<string>('CONTRACT_ADDRESS_USDT') || '';
    if (!this.ADDRESS_BUY_CARD || !this.CONTRACT_ADDRESS_USDT) {
      this.logger.error(
        'Missing ADDRESS_BUY_CARD or CONTRACT_ADDRESS_USDT environment variables. Balance monitoring will not function.',
      );
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    if (this.shouldSkipMonitoring()) {
      this.logger.debug('Skipping monitoring due to API issues...');
      return;
    }

    this.logger.debug('Fetching balance from Etherscan API...');

    const balanceInfo = await this.etherscanService.getTokenBalance(
      this.ADDRESS_BUY_CARD,
      this.CONTRACT_ADDRESS_USDT,
      56, // BSC Chain ID
    );

    if (balanceInfo) {
      this.logger.log(
        `Balance fetched: ${balanceInfo.balanceFormatted} ${balanceInfo.symbol}`,
      );

      await this.cacheManager.set(
        'buy_card_balance',
        balanceInfo,
        35 * 60 * 1000, // TTL 35 minutes
      );

      this.apiErrorCount = 0;

      setTimeout(
        async () => {
          await this.sendNotificationsToUsers(balanceInfo);
        },
        5 * 60 * 1000, // 5 minutes delay
      );
    } else {
      this.apiErrorCount++;
      this.lastApiErrorTime = new Date();

      if (this.apiErrorCount >= 3) {
        await this.sendDiscordErrorNotification();
      }
    }
  }

  private shouldSkipMonitoring(): boolean {
    if (this.apiErrorCount >= 3 && this.lastApiErrorTime) {
      const timeSinceLastError = Date.now() - this.lastApiErrorTime.getTime();
      const skipDuration = 30 * 60 * 1000; // 30 minutes

      if (timeSinceLastError < skipDuration) {
        return true;
      } else {
        // Reset error count after skip duration
        this.apiErrorCount = 0;
        this.lastApiErrorTime = null;
      }
    }
    return false;
  }

  private async sendNotificationsToUsers(balanceInfo: any): Promise<void> {
    try {
      this.logger.debug('Sending notifications to users...');
      const activeReminders = await this.reminderService.getActiveReminders();

      for (const reminder of activeReminders) {
        const balance = parseFloat(balanceInfo.balanceFormatted);

        if (balance < reminder.threshold) {
          const alertMessage = this.buildBalanceAlertMessage(
            this.ADDRESS_BUY_CARD,
            balanceInfo.symbol,
            balanceInfo.balanceFormatted,
            reminder.threshold,
          );

          await this.botService.sendMessage(reminder.telegramId, alertMessage);
          await this.reminderService.updateLastChecked(
            reminder.telegramId,
            balanceInfo.balanceFormatted,
          );

          this.logger.warn(
            `Alert sent to user ${reminder.telegramId}: Balance (${balanceInfo.balanceFormatted}) below threshold (${reminder.threshold})`,
          );
        } else {
          this.logger.log(
            `Balance for user ${reminder.telegramId} is ${balanceInfo.balanceFormatted}, which is above threshold ${reminder.threshold}. No alert sent.`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending notifications to users:', error);
    }
  }

  private buildBalanceAlertMessage(
    address: string,
    symbol: string,
    balance: string,
    threshold: number,
  ): string {
    const formattedBalance = formatNumber(parseFloat(balance));
    const formattedThreshold = formatNumber(threshold);
    const addressShort = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return `🚨 *Balance Alert*

*Buy Card Fund Balance:*
\`${formattedBalance} ${symbol}\`

*Alert Threshold:*
\`${formattedThreshold} ${symbol}\`

*Wallet Address:*
\`${addressShort}\`

*Status:* ⚠️ Balance below threshold

*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}

Please check your Buy Card Fund balance\\.`;
  }

  private async sendDiscordErrorNotification(): Promise<void> {
    try {
      // Get active reminders
      const activeReminders = await this.reminderService.getActiveReminders();

      // Get API keys info
      const primaryApiKey =
        this.configService.get<string>('ETHERSCAN_API_KEY') || '';
      const fallbackApiKey =
        this.configService.get<string>('ETHERSCAN_API_KEY_2') || '';

      // Prepare user info
      const affectedUsers = activeReminders.map((reminder) => ({
        telegramId: reminder.telegramId,
        threshold: reminder.threshold,
        intervalMinutes: reminder.intervalMinutes,
        lastCheckedAt: reminder.lastCheckedAt,
        alertCount: reminder.alertCount,
      }));

      await this.discordWebhookService.sendApiErrorNotification({
        primaryApiKey: primaryApiKey
          ? primaryApiKey.substring(0, 8) + '...'
          : 'Not set',
        fallbackApiKey: fallbackApiKey
          ? fallbackApiKey.substring(0, 8) + '...'
          : 'Not set',
        errorMessage: 'Multiple consecutive API failures detected',
        affectedUsers,
        timestamp: new Date(),
      });

      this.logger.log('Discord error notification sent');
    } catch (error) {
      this.logger.error('Failed to send Discord error notification:', error);
    }
  }
}
