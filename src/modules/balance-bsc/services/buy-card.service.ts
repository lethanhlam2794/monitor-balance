import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EtherscanService } from '../etherscan.service';
import { ReminderService } from './reminder.service';
import { BalanceMonitoringQueueService } from '../../bull/services/balance-monitoring-queue.service';
import { ERR_CODE } from '@shared/constants';

export interface BuyCardResult {
  success: boolean;
  message?: string;
  data?: {
    walletAddress: string;
    symbol: string;
    balanceFormatted: string;
    chainId: number;
  };
}

@Injectable()
export class BuyCardService {
  private readonly logger = new Logger(BuyCardService.name);

  constructor(
    private etherscanService: EtherscanService,
    private reminderService: ReminderService,
    private balanceMonitoringQueueService: BalanceMonitoringQueueService,
    private configService: ConfigService,
  ) {}

  /**
   * Xem balance Buy Card Fund
   */
  async viewBuyCardBalance(): Promise<BuyCardResult> {
    try {
      const walletAddress =
        this.configService.get<string>('ADDRESS_BUY_CARD') || '';
      const contractAddress =
        this.configService.get<string>('CONTRACT_ADDRESS_USDT') || '';
      const chainId = 56; // BSC

      // Kiểm tra environment variables
      if (!walletAddress) {
        this.logger.error(`Missing environment variable: ADDRESS_BUY_CARD`, {
          errorCode: ERR_CODE.MISSING_ENV_VARIABLE,
        });
        return {
          success: false,
          message: '❌ Thiếu cấu hình địa chỉ ví Buy Card!',
        };
      }

      if (!contractAddress) {
        this.logger.error(
          `Missing environment variable: CONTRACT_ADDRESS_USDT`,
          {
            errorCode: ERR_CODE.MISSING_ENV_VARIABLE,
          },
        );
        return {
          success: false,
          message: '❌ Thiếu cấu hình địa chỉ contract USDT!',
        };
      }

      const balanceInfo = await this.etherscanService.getTokenBalance(
        walletAddress,
        contractAddress,
        chainId,
      );

      if (!balanceInfo) {
        return {
          success: false,
          message: '❌ Không thể lấy thông tin balance!',
        };
      }

      return {
        success: true,
        data: {
          walletAddress,
          symbol: balanceInfo.symbol,
          balanceFormatted: balanceInfo.balanceFormatted,
          chainId,
        },
      };
    } catch (error) {
      this.logger.error('Error in viewBuyCardBalance:', error);
      return {
        success: false,
        message: 'Error occurred while checking balance!',
      };
    }
  }

  /**
   * Đặt lịch nhắc kiểm tra balance
   */
  async setReminder(
    telegramId: number,
    threshold: number,
    intervalMinutes: number = 30,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate input
      if (isNaN(threshold) || threshold < 0) {
        return {
          success: false,
          message: 'Alert threshold must be a positive number!',
        };
      }

      if (
        isNaN(intervalMinutes) ||
        intervalMinutes < 30 ||
        intervalMinutes > 1440
      ) {
        return {
          success: false,
          message:
            'Interval must be between 30 minutes and 1440 minutes (24 hours)!',
        };
      }

      if (threshold === 0) {
        // Tắt nhắc nhở
        const success =
          await this.reminderService.deactivateReminder(telegramId);
        if (success) {
          return {
            success: true,
            message: 'Balance monitoring reminder disabled successfully!',
          };
        } else {
          return {
            success: false,
            message: 'No active reminder found to disable!',
          };
        }
      }

      // Use Bull Queue to schedule job
      await this.balanceMonitoringQueueService.scheduleUserReminder(
        telegramId,
        threshold,
        intervalMinutes,
      );

      return {
        success: true,
        message: `**✅ Reminder set successfully!**

**Alert Threshold:** ${threshold} USDT
**Check Interval:** ${intervalMinutes} minutes
**Status:** Active

Bot will automatically check balance every 30 minutes and send alerts 5 minutes after check if balance < ${threshold} USDT.`,
      };
    } catch (error) {
      this.logger.error('Error in setReminder:', error);
      return {
        success: false,
        message: 'Error occurred while setting reminder!',
      };
    }
  }

  /**
   * Lấy hướng dẫn sử dụng command
   */
  getReminderHelpMessage(): string {
    return `**Set Balance Monitoring Reminder**

**Syntax:** \`/monitor_buy_card\`

Use this command to choose alert threshold from menu or enter custom number.

**Operation:**
• Bot checks balance every 30 minutes
• Send notifications 5 minutes after check if balance < set threshold
• Uses Redis cache for performance optimization`;
  }
}
