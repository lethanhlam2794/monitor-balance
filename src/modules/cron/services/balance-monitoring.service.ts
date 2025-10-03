import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../../balance-bsc/services/reminder.service';
import { EtherscanService } from '../../balance-bsc/etherscan.service';
import { BotService } from '../../bot-telegram/bot.service';
import { ConfigService } from '@nestjs/config';
import { MessageBuilder, escapeMarkdownV2, formatNumber } from '@shared/message_builder';
import { getMessage, BotMessages } from '@shared/enums/bot-messages.enum';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';
import { ADDRESS_BUY_CARD, CONTRACT_ADDRESS_USDT } from '@shared/constants';

@Injectable()
export class BalanceMonitoringService {
  private readonly logger = new Logger(BalanceMonitoringService.name);
  private readonly ADDRESS_BUY_CARD: string;
  private readonly CONTRACT_ADDRESS_USDT: string;

  constructor(
    private reminderService: ReminderService,
    private etherscanService: EtherscanService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private configService: ConfigService,
    private discordWebhookService: DiscordWebhookService,
  ) {
    this.ADDRESS_BUY_CARD = ADDRESS_BUY_CARD || '';
    this.CONTRACT_ADDRESS_USDT = CONTRACT_ADDRESS_USDT || '';
    if (!this.ADDRESS_BUY_CARD || !this.CONTRACT_ADDRESS_USDT) {
      this.logger.error('Missing ADDRESS_BUY_CARD or CONTRACT_ADDRESS_USDT environment variables. Balance monitoring will not function.');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for active reminders...');
    const activeReminders = await this.reminderService.getActiveReminders();

    for (const reminder of activeReminders) {
      const now = new Date();
      const lastChecked = reminder.lastCheckedAt || new Date(0);
      const intervalMs = reminder.intervalMinutes * 60 * 1000;

      if (now.getTime() - lastChecked.getTime() >= intervalMs) {
        this.logger.log(`Processing reminder for user ${reminder.telegramId}`);
        const balanceInfo = await this.checkAndSendAlert(reminder.telegramId, reminder.threshold);
        if (balanceInfo) {
          await this.reminderService.updateLastChecked(reminder.telegramId, balanceInfo.balanceFormatted);
        }
      }
    }
  }

  private async checkAndSendAlert(telegramId: number, threshold: number): Promise<any> {
    if (!this.ADDRESS_BUY_CARD || !this.CONTRACT_ADDRESS_USDT) {
      this.logger.error(`Cannot check balance for user ${telegramId}: Missing environment variables.`);
      await this.botService.sendMessage(telegramId, getMessage(BotMessages.ERROR_MISSING_ADDRESS_BUY_CARD));
      return;
    }

    const balanceInfo = await this.etherscanService.getTokenBalance(
      this.ADDRESS_BUY_CARD,
      this.CONTRACT_ADDRESS_USDT,
      56 // BSC Chain ID
    );

    if (balanceInfo && parseFloat(balanceInfo.balanceFormatted) < threshold) {
      const alertMessage = this.buildBalanceAlertMessage(
        this.ADDRESS_BUY_CARD,
        balanceInfo.symbol,
        balanceInfo.balanceFormatted,
        threshold
      );
      const keyboard = this.buildCopyAddressKeyboard(this.ADDRESS_BUY_CARD);
      await this.botService.sendMessageWithKeyboard(telegramId, alertMessage, keyboard);
      this.logger.warn(`Alert sent to user ${telegramId}: Balance (${balanceInfo.balanceFormatted}) below threshold (${threshold})`);
    } else if (!balanceInfo) {
      this.logger.error(`Failed to fetch balance for user ${telegramId}.`);
      await this.botService.sendMessage(telegramId, getMessage(BotMessages.ERROR_BALANCE_FETCH_FAILED));
    } else {
      this.logger.log(`Balance for user ${telegramId} is ${balanceInfo.balanceFormatted}, which is above threshold ${threshold}. No alert sent.`);
    }

    return balanceInfo;
  }

  private buildBalanceAlertMessage(walletAddress: string, symbol: string, balance: string, threshold: number): string {
    const balanceNumber = parseFloat(balance);
    const title = escapeMarkdownV2('Buy Card Alert!');
    const walletLabel = escapeMarkdownV2('Wallet Address:');
    const balanceLabel = escapeMarkdownV2('Current Balance:');
    const thresholdLabel = escapeMarkdownV2('Alert Threshold:');
    const footer = escapeMarkdownV2('Balance is below the set threshold.');

    return `*${title}*

*${walletLabel}* \`${escapeMarkdownV2(walletAddress)}\`
*${balanceLabel}* ${escapeMarkdownV2(formatNumber(balanceNumber))} ${escapeMarkdownV2(symbol)}
*${thresholdLabel}* ${escapeMarkdownV2(formatNumber(threshold))} ${escapeMarkdownV2(symbol)}

${footer}`;
  }

  private buildCopyAddressKeyboard(walletAddress: string) {
    return {
      inline_keyboard: [
        [
          {
            text: '📋 Copy wallet address',
            url: `https://t.me/share/url?url=${encodeURIComponent(walletAddress)}`
          }
        ]
      ]
    };
  }

  /**
   * Send Discord notification when API fails
   */
  private async sendDiscordErrorNotification(): Promise<void> {
    try {
      // Get active reminders
      const activeReminders = await this.reminderService.getActiveReminders();
      
      // Get API keys info
      const primaryApiKey = this.configService.get<string>('ETHERSCAN_API_KEY') || '';
      const fallbackApiKey = this.configService.get<string>('ETHERSCAN_API_KEY_2') || '';
      
      // Prepare user info
      const affectedUsers = activeReminders.map(reminder => ({
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
