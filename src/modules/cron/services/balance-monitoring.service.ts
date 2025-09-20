import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../../balance-bsc/services/reminder.service';
import { EtherscanService } from '../../balance-bsc/etherscan.service';
import { BotService } from '../../bot-telegram/bot.service';
import { ConfigService } from '@nestjs/config';
import { MessageBuilder } from '@shared/message_builder';
import { getMessage, BotMessages } from '@shared/enums/bot-messages.enum';

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
  ) {
    this.ADDRESS_BUY_CARD = this.configService.get<string>('ADDRESS_BUY_CARD') || '';
    this.CONTRACT_ADDRESS_USDT = this.configService.get<string>('CONTRACT_ADDRESS_USDT') || '';
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
      await this.botService.sendMessage(telegramId, alertMessage);
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
    return `**Buy Card Alert!**

**Wallet Address:** \`${walletAddress}\`
**Current Balance:** ${balance} ${symbol}
**Alert Threshold:** ${threshold} ${symbol}

Balance is below the set threshold.`;
  }
}
