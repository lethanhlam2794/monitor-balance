import { Injectable, Logger } from '@nestjs/common';
import { BuyCardService } from '../services/buy-card.service';
import { EtherscanService } from '../etherscan.service';
import { PartnerService } from '../services/partner.service';
import { MessageBuilder, escapeMarkdownV2 } from '@shared/message_builder';
import { getMessage, BotMessages } from '@shared/enums/bot-messages.enum';

export interface BuyCardResponse {
  success: boolean;
  message: string;
  keyboard?: any;
}

@Injectable()
export class BuyCardControllerService {
  private readonly logger = new Logger(BuyCardControllerService.name);

  constructor(
    private buyCardService: BuyCardService,
    private etherscanService: EtherscanService,
    private partnerService: PartnerService,
  ) {}

  /**
   * Xử lý command /view_buycard - Hiển thị danh sách partners để chọn
   */
  async handleViewBuyCardCommand(userRole?: string): Promise<BuyCardResponse> {
    try {
      const partners = await this.partnerService.getActivePartners();

      if (partners.length === 0) {
        return {
          success: false,
          message:
            '❌ Chưa có partner nào được cấu hình. Vui lòng liên hệ admin.',
        };
      }

      if (partners.length === 1) {
        // Nếu chỉ có 1 partner, tự động chọn
        const partner = partners[0];
        return await this.handleViewBuyCardForPartner(partner.name, userRole);
      }

      // Nếu có nhiều partners, hiển thị keyboard chọn
      let message = '📋 **Chọn Partner để xem balance:**\n\n';
      partners.forEach((partner, index) => {
        message += `**${index + 1}\\. ${escapeMarkdownV2(partner.displayName)}**\n`;
        message += `• Token: ${escapeMarkdownV2(partner.tokenSymbol)}\n`;
        message += `• Chain: ${escapeMarkdownV2(partner.chainId.toString())}\n\n`;
      });

      const keyboard = this.createPartnerSelectionKeyboard(partners);

      return {
        success: true,
        message: message,
        keyboard: keyboard,
      };
    } catch (error) {
      this.logger.error('Error in handleViewBuyCardCommand:', error);
      return {
        success: false,
        message: getMessage(BotMessages.ERROR_BALANCE_CHECK_FAILED),
      };
    }
  }

  /**
   * Xử lý xem balance cho partner cụ thể
   */
  async handleViewBuyCardForPartner(
    partnerName: string,
    userRole?: string,
  ): Promise<BuyCardResponse> {
    try {
      const partner = await this.partnerService.getPartnerByName(partnerName);

      if (!partner) {
        return {
          success: false,
          message: `❌ Không tìm thấy partner "${partnerName}"!`,
        };
      }

      const balanceInfo = await this.etherscanService.getTokenBalance(
        partner.walletAddress,
        partner.contractAddress,
        partner.chainId,
      );

      if (!balanceInfo) {
        return {
          success: false,
          message: '❌ Không thể lấy thông tin balance!',
        };
      }

      const buyCardMessage = MessageBuilder.buildBuyCardMessage(
        balanceInfo.address,
        balanceInfo.symbol,
        balanceInfo.balanceFormatted,
        partner.chainId,
        partner.displayName,
      );

      // Tạo keyboard cho tất cả user (tạm thời để debug)
      let keyboard;
      this.logger.log(`User role: ${userRole}`);
      if (userRole === 'USER' || userRole === 'ADVANCED_USER' || !userRole) {
        keyboard = MessageBuilder.buildCopyWalletKeyboard(balanceInfo.address);
      }

      return {
        success: true,
        message: buyCardMessage,
        keyboard: keyboard,
      };
    } catch (error) {
      this.logger.error('Error in handleViewBuyCardForPartner:', error);
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

  /**
   * Clear tất cả cache balance
   */
  async clearAllBalanceCache(): Promise<void> {
    return this.etherscanService.clearAllBalanceCache();
  }

  /**
   * Clear cache cho một address cụ thể
   */
  async clearBalanceCache(
    address: string,
    contractAddress: string,
    chainId: number = 56,
  ): Promise<void> {
    return this.etherscanService.clearBalanceCache(
      address,
      contractAddress,
      chainId,
    );
  }

  /**
   * Lấy thông tin API key status
   */
  getApiKeyStatus(): {
    primaryKey: string;
    fallbackKey: string;
    primaryErrors: number;
    fallbackErrors: number;
  } {
    return this.etherscanService.getApiKeyStatus();
  }

  /**
   * Tạo keyboard chọn partner
   */
  private createPartnerSelectionKeyboard(partners: any[]): any {
    const keyboard = {
      inline_keyboard: [] as any[],
    };

    // Tạo buttons cho mỗi partner (tối đa 2 partners per row)
    for (let i = 0; i < partners.length; i += 2) {
      const row: any[] = [];

      // Partner đầu tiên trong row
      row.push({
        text: `📊 ${partners[i].displayName}`,
        callback_data: `view_partner_${partners[i].name}`,
      });

      // Partner thứ hai trong row (nếu có)
      if (i + 1 < partners.length) {
        row.push({
          text: `📊 ${partners[i + 1].displayName}`,
          callback_data: `view_partner_${partners[i + 1].name}`,
        });
      }

      keyboard.inline_keyboard.push(row);
    }

    return keyboard;
  }
}
