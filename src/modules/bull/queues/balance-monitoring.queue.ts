import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EtherscanService } from '../../balance-bsc/etherscan.service';
import { BotService } from '../../bot-telegram/bot.service';

export interface BalanceMonitoringJobData {
  telegramId: number;
  threshold: number;
  walletAddress: string;
  contractAddress: string;
  chainId: number;
  partnerName?: string;
}

@Processor('balance-monitoring')
export class BalanceMonitoringProcessor {
  private readonly logger = new Logger(BalanceMonitoringProcessor.name);

  constructor(
    private etherscanService: EtherscanService,
    private botService: BotService,
  ) {}

  @Process('check-balance')
  async handleBalanceCheck(job: Job<BalanceMonitoringJobData>) {
    const {
      telegramId,
      threshold,
      walletAddress,
      contractAddress,
      chainId,
      partnerName,
    } = job.data;

    this.logger.log(`Processing balance check for user ${telegramId}`);

    try {
      // Lấy balance từ Etherscan
      const balanceInfo = await this.etherscanService.getTokenBalance(
        walletAddress,
        contractAddress,
        chainId,
      );

      if (balanceInfo) {
        const balance = parseFloat(balanceInfo.balanceFormatted);

        if (balance < threshold) {
          // Gửi alert
          const alertMessage = this.buildBalanceAlertMessage(
            walletAddress,
            balanceInfo.symbol,
            balanceInfo.balanceFormatted,
            threshold,
            partnerName,
          );

          await this.botService.sendMessage(telegramId, alertMessage);
          this.logger.warn(
            `Alert sent to user ${telegramId}: Balance (${balanceInfo.balanceFormatted}) below threshold (${threshold})`,
          );
        } else {
          this.logger.log(
            `Balance for user ${telegramId} is ${balanceInfo.balanceFormatted}, which is above threshold ${threshold}. No alert sent.`,
          );
        }
      } else {
        this.logger.warn(
          `Failed to fetch balance for user ${telegramId} - API may be temporarily unavailable`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing balance check for user ${telegramId}:`,
        error,
      );
      throw error; // Re-throw để Bull có thể retry
    }
  }

  private buildBalanceAlertMessage(
    walletAddress: string,
    symbol: string,
    balance: string,
    threshold: number,
    partnerName?: string,
  ): string {
    const title = partnerName
      ? `🚨 Cảnh báo ${partnerName}!`
      : '🚨 Cảnh báo Buy Card!';
    return `**${title}**

**Địa chỉ ví:** \`${walletAddress}\`
**Số dư hiện tại:** ${balance} ${symbol}
**Ngưỡng cảnh báo:** ${threshold} ${symbol}

Số dư đã xuống dưới ngưỡng đã đặt.`;
  }
}
