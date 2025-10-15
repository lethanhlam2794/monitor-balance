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
   * Handle /view_buycard command - Show partners list to select
   */
  async handleViewBuyCardCommand(userRole?: string): Promise<BuyCardResponse> {
    try {
      const partners = await this.partnerService.getActivePartners();

      if (partners.length === 0) {
        return {
          success: false,
          message: '❌ No partners configured yet. Please contact admin.',
        };
      }

      if (partners.length === 1) {
        // If only 1 partner, auto select
        const partner = partners[0];
        return await this.handleViewBuyCardForPartner(partner.name, userRole);
      }

      // If multiple partners, show selection keyboard
      let message = '📋 **Select Partner to view balance:**\n\n';
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
   * Handle viewing balance for specific partner
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
          message: `❌ Partner "${partnerName}" not found!`,
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
          message: '❌ Unable to fetch balance information!',
        };
      }

      const buyCardMessage = MessageBuilder.buildBuyCardMessage(
        balanceInfo.address,
        balanceInfo.symbol,
        balanceInfo.balanceFormatted,
        partner.chainId,
        partner.displayName,
      );

      // Create keyboard for all users (temporary for debug)
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
   * Handle /monitor_buy_card command
   */
  async handleMonitorBuyCardCommand(
    telegramId: number,
    commandText?: string,
  ): Promise<BuyCardResponse> {
    try {
      // Parse command arguments
      const args = commandText?.split(' ').slice(1) || [];

      if (args.length === 0) {
        // Show usage instructions
        const helpMessage = this.buyCardService.getReminderHelpMessage();
        this.logger.log('Success: true', helpMessage);
        return {
          success: true,
          message: helpMessage,
        };
      }

      const threshold = parseFloat(args[0]);
      const intervalMinutes = args[1] ? parseInt(args[1]) : 15;

      // Call service to handle logic
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
   * Set balance check reminder schedule
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
   * Clear all cache balance
   */
  async clearAllBalanceCache(): Promise<void> {
    return this.etherscanService.clearAllBalanceCache();
  }

  /**
   * Clear cache for a specific address
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
   * Get API key status information
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
   * Create partner selection keyboard
   */
  private createPartnerSelectionKeyboard(partners: any[]): any {
    const keyboard = {
      inline_keyboard: [] as any[],
    };

    // Create buttons for each partner (max 2 partners per row)
    for (let i = 0; i < partners.length; i += 2) {
      const row: any[] = [];

      // First partner in row
      row.push({
        text: `📊 ${partners[i].displayName}`,
        callback_data: `view_partner_${partners[i].name}`,
      });

      // Second partner in row (if any)
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
