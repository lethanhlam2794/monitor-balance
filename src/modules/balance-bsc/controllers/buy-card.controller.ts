import { Injectable, Logger } from '@nestjs/common';
import { BuyCardService } from '../services/buy-card.service';
import { MessageBuilder } from '@shared/message_builder';
import { getMessage, BotMessages } from '@shared/enums/bot-messages.enum';

export interface BuyCardResponse {
  success: boolean;
  message: string;
  keyboard?: any;
}

@Injectable()
export class BuyCardControllerService {
  private readonly logger = new Logger(BuyCardControllerService.name);

  constructor(private buyCardService: BuyCardService) {}

  /**
   * Xử lý command /view_buycard
   */
  async handleViewBuyCardCommand(userRole?: string): Promise<BuyCardResponse> {
    try {
      const result = await this.buyCardService.viewBuyCardBalance();

      if (result.success && result.data) {
        const buyCardMessage = MessageBuilder.buildBuyCardMessage(
          result.data.walletAddress,
          result.data.symbol,
          result.data.balanceFormatted,
          result.data.chainId,
        );

        // Chỉ tạo keyboard cho User và Advanced User
        let keyboard;
        if (userRole === 'USER' || userRole === 'ADVANCED_USER') {
          keyboard = MessageBuilder.buildCopyWalletKeyboard(
            result.data.walletAddress,
          );
        }

        this.logger.log('Success: true', buyCardMessage);
        return {
          success: true,
          message: buyCardMessage,
          keyboard: keyboard,
        };
      } else {
        return {
          success: false,
          message:
            result.message ||
            getMessage(BotMessages.ERROR_BALANCE_FETCH_FAILED),
        };
      }
    } catch (error) {
      this.logger.error('Error in handleViewBuyCardCommand:', error);
      return {
        success: false,
        message: getMessage(BotMessages.ERROR_BALANCE_CHECK_FAILED),
      };
    }
  }

  /**
   * Xử lý command /monitor_buy_card
   */
  async handleMonitorBuyCardCommand(
    telegramId: number,
    commandText?: string,
  ): Promise<BuyCardResponse> {
    try {
      // Parse command arguments
      const args = commandText?.split(' ').slice(1) || [];

      if (args.length === 0) {
        // Hiển thị hướng dẫn sử dụng
        const helpMessage = this.buyCardService.getReminderHelpMessage();
        this.logger.log('Success: true', helpMessage);
        return {
          success: true,
          message: helpMessage,
        };
      }

      const threshold = parseFloat(args[0]);
      const intervalMinutes = args[1] ? parseInt(args[1]) : 15;

      // Gọi service để xử lý logic
      const result = await this.buyCardService.setReminder(
        telegramId,
        threshold,
        intervalMinutes,
      );

      if (result.success) {
        this.logger.log('Success: true', result.message);
      }
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.error('Error in handleMonitorBuyCardCommand:', error);
      return {
        success: false,
        message: getMessage(BotMessages.ERROR_GENERAL),
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
    return this.buyCardService.setReminder(
      telegramId,
      threshold,
      intervalMinutes,
    );
  }
}
