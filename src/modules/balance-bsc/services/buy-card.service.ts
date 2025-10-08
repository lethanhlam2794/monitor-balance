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
    private configService: ConfigService,
    private etherscanService: EtherscanService,
    private reminderService: ReminderService,
    private balanceMonitoringQueueService: BalanceMonitoringQueueService,
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
          message: '❌ Ngưỡng cảnh báo phải là số dương!',
        };
      }

      if (
        isNaN(intervalMinutes) ||
        intervalMinutes < 30 ||
        intervalMinutes > 1440
      ) {
        return {
          success: false,
          message: '❌ Tần suất kiểm tra phải từ 30 đến 1440 phút (24 giờ)!',
        };
      }

      if (threshold === 0) {
        // Tắt nhắc nhở
        const success =
          await this.reminderService.deactivateReminder(telegramId);
        if (success) {
          return {
            success: true,
            message: '✅ Đã tắt nhắc nhở kiểm tra số dư thành công!',
          };
        } else {
          return {
            success: false,
            message: '❌ Không tìm thấy nhắc nhở nào để tắt!',
          };
        }
      }

      // Sử dụng Bull Queue để schedule job
      await this.balanceMonitoringQueueService.scheduleUserReminder(
        telegramId,
        threshold,
        intervalMinutes,
      );

      return {
        success: true,
        message: `**✅ Đã đặt nhắc nhở thành công!**

**Ngưỡng cảnh báo:** ${threshold} USDT
**Tần suất kiểm tra:** ${intervalMinutes} phút
**Trạng thái:** Hoạt động

Bot sẽ tự động kiểm tra số dư mỗi 30 phút và gửi cảnh báo 5 phút sau khi kiểm tra nếu số dư < ${threshold} USDT.`,
      };
    } catch (error) {
      this.logger.error('Error in setReminder:', error);
      return {
        success: false,
        message: '❌ Có lỗi xảy ra khi đặt nhắc nhở!',
      };
    }
  }

  /**
   * Lấy hướng dẫn sử dụng command
   */
  getReminderHelpMessage(): string {
    return `**Đặt nhắc nhở kiểm tra số dư**

**Cú pháp:** \`/monitor_buy_card\`

Sử dụng lệnh này để chọn ngưỡng cảnh báo từ menu hoặc nhập số tùy chỉnh.

**Hoạt động:**
• Bot kiểm tra số dư mỗi 30 phút
• Gửi thông báo 5 phút sau khi kiểm tra nếu số dư < ngưỡng đã đặt
• Sử dụng Redis cache để tối ưu hiệu suất`;
  }
}
