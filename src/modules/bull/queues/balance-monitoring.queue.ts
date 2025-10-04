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
    const { telegramId, threshold, walletAddress, contractAddress, chainId } = job.data;
    
    this.logger.log(`Processing balance check for user ${telegramId}`);

    try {
      // Get balance from Etherscan
      const balanceInfo = await this.etherscanService.getTokenBalance(
        walletAddress,
        contractAddress,
        chainId
      );

      if (balanceInfo) {
        const balance = parseFloat(balanceInfo.balanceFormatted);
        
        if (balance < threshold) {
          // Send alert
          const alertMessage = this.buildBalanceAlertMessage(
            walletAddress,
            balanceInfo.symbol,
            balanceInfo.balanceFormatted,
            threshold
          );
          
          await this.botService.sendMessage(telegramId, alertMessage);
          this.logger.warn(`Alert sent to user ${telegramId}: Balance (${balanceInfo.balanceFormatted}) below threshold (${threshold})`);
        } else {
          this.logger.log(`Balance for user ${telegramId} is ${balanceInfo.balanceFormatted}, which is above threshold ${threshold}. No alert sent.`);
        }
      } else {
        this.logger.warn(`Failed to fetch balance for user ${telegramId} - API may be temporarily unavailable`);
      }
    } catch (error) {
      this.logger.error(`Error processing balance check for user ${telegramId}:`, error);
      throw error; // Re-throw for Bull to retry
    }
  }

  private buildBalanceAlertMessage(walletAddress: string, symbol: string, balance: string, threshold: number): string {
    return `**Buy Card Alert!**

**Wallet Address:** \`${walletAddress}\`
**Current Balance:** ${balance} ${symbol}
**Alert Threshold:** ${threshold} ${symbol}

Balance is below the set threshold.`;
  }
}
