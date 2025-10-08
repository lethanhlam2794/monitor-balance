import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../../balance-bsc/services/reminder.service';
import { EtherscanService } from '../../balance-bsc/etherscan.service';
import { BotService } from '../../bot-telegram/bot.service';
import { ConfigService } from '@nestjs/config';
import { MessageBuilder } from '@shared/message_builder';
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
    // Kiểm tra nếu API bị block quá nhiều lần
    if (this.shouldSkipMonitoring()) {
      this.logger.debug('Skipping monitoring due to API issues...');
      return;
    }

    this.logger.debug('Fetching balance from Etherscan API...');

    // Gọi API Etherscan để lấy balance (sẽ được cache)
    const balanceInfo = await this.etherscanService.getTokenBalance(
      this.ADDRESS_BUY_CARD,
      this.CONTRACT_ADDRESS_USDT,
      56, // BSC Chain ID
    );

    if (balanceInfo) {
      this.logger.log(
        `Balance fetched: ${balanceInfo.balanceFormatted} ${balanceInfo.symbol}`,
      );

      // Lưu balance vào Redis với TTL 35 phút (lâu hơn cron 30 phút)
      await this.cacheManager.set(
        'buy_card_balance',
        balanceInfo,
        35 * 60 * 1000,
      );

      // Reset error count khi thành công
      this.apiErrorCount = 0;

      // Lên lịch gửi thông báo sau 5 phút
      setTimeout(
        async () => {
          await this.sendNotificationsToUsers(balanceInfo);
        },
        5 * 60 * 1000,
      ); // 5 phút
    } else {
      // Tăng error count khi thất bại
      this.apiErrorCount++;
      this.lastApiErrorTime = new Date();

      // Nếu có quá nhiều lỗi liên tiếp, gửi Discord notification
      if (this.apiErrorCount >= 3) {
        await this.sendDiscordErrorNotification();
      }
    }
  }

  /**
   * Gửi thông báo cho tất cả users có reminder active
   */
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

  private async checkAndSendAlert(
    telegramId: number,
    threshold: number,
  ): Promise<any> {
    if (!this.ADDRESS_BUY_CARD || !this.CONTRACT_ADDRESS_USDT) {
      this.logger.error(
        `Cannot check balance for user ${telegramId}: Missing environment variables.`,
      );
      await this.botService.sendMessage(
        telegramId,
        getMessage(BotMessages.ERROR_MISSING_ADDRESS_BUY_CARD),
      );
      return;
    }

    const balanceInfo = await this.etherscanService.getTokenBalance(
      this.ADDRESS_BUY_CARD,
      this.CONTRACT_ADDRESS_USDT,
      56, // BSC Chain ID
    );

    if (balanceInfo && parseFloat(balanceInfo.balanceFormatted) < threshold) {
      const alertMessage = this.buildBalanceAlertMessage(
        this.ADDRESS_BUY_CARD,
        balanceInfo.symbol,
        balanceInfo.balanceFormatted,
        threshold,
      );
      await this.botService.sendMessage(telegramId, alertMessage);
      this.logger.warn(
        `Alert sent to user ${telegramId}: Balance (${balanceInfo.balanceFormatted}) below threshold (${threshold})`,
      );
    } else if (!balanceInfo) {
      // Chỉ log error nếu không phải lỗi API tạm thời
      this.logger.warn(
        `Failed to fetch balance for user ${telegramId} - API may be temporarily unavailable`,
      );
      // Không gửi message cho user khi API bị block
      // await this.botService.sendMessage(telegramId, getMessage(BotMessages.ERROR_BALANCE_FETCH_FAILED));
    } else {
      this.logger.log(
        `Balance for user ${telegramId} is ${balanceInfo.balanceFormatted}, which is above threshold ${threshold}. No alert sent.`,
      );
    }

    return balanceInfo;
  }

  private buildBalanceAlertMessage(
    walletAddress: string,
    symbol: string,
    balance: string,
    threshold: number,
  ): string {
    return `**Buy Card Alert!**

**Wallet Address:** \`${walletAddress}\`
**Current Balance:** ${balance} ${symbol}
**Alert Threshold:** ${threshold} ${symbol}

Balance is below the set threshold.`;
  }

  /**
   * Kiểm tra có nên skip monitoring không
   * Skip nếu API bị lỗi quá nhiều lần liên tiếp
   */
  private shouldSkipMonitoring(): boolean {
    // Nếu có quá 5 lỗi liên tiếp trong 10 phút, skip monitoring
    if (this.apiErrorCount >= 5) {
      const now = new Date();
      const timeSinceLastError = this.lastApiErrorTime
        ? (now.getTime() - this.lastApiErrorTime.getTime()) / (1000 * 60)
        : 0;

      // Nếu đã qua 10 phút kể từ lỗi cuối, reset counter
      if (timeSinceLastError > 10) {
        this.apiErrorCount = 0;
        this.lastApiErrorTime = null;
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Gửi Discord notification khi API bị lỗi
   */
  private async sendDiscordErrorNotification(): Promise<void> {
    try {
      // Lấy danh sách active reminders
      const activeReminders = await this.reminderService.getActiveReminders();

      // Lấy thông tin API keys
      const primaryApiKey =
        this.configService.get<string>('ETHERSCAN_API_KEY') || '';
      const fallbackApiKey =
        this.configService.get<string>('ETHERSCAN_API_KEY_2') || '';

      // Chuẩn bị thông tin user
      const affectedUsers = activeReminders.map((reminder) => ({
        telegramId: reminder.telegramId,
        threshold: reminder.threshold,
        intervalMinutes: reminder.intervalMinutes,
        lastCheckedAt: reminder.lastCheckedAt,
        alertCount: reminder.alertCount,
      }));

      await this.discordWebhookService.sendApiErrorNotification({
        primaryApiKey,
        fallbackApiKey,
        errorMessage: 'Both primary and fallback API keys failed',
        affectedUsers,
        timestamp: new Date(),
      });

      this.logger.log('Discord error notification sent');
    } catch (error) {
      this.logger.error('Failed to send Discord error notification:', error);
    }
  }
}
