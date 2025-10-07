import { Injectable, Logger } from '@nestjs/common';
import { BotMessages, getMessage } from '@shared/enums/bot-messages.enum';
import { MasterFundVinachainService } from '../services/masterfund-vinachain.service';
import { AuthService } from '../../auth/auth.service';
import { MessageBuilder } from '@shared/message_builder';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

interface MasterFundVinachainResponse {
  success: boolean;
  message: string;
  keyboard?: any;
}

@Injectable()
export class MasterFundVinachainControllerService {
  private readonly logger = new Logger(
    MasterFundVinachainControllerService.name,
  );

  constructor(
    private masterFundVinachainService: MasterFundVinachainService,
    private authService: AuthService,
    private discordWebhook: DiscordWebhookService,
  ) {}

  async handleMasterFundVinachainCommand(
    chatId: number,
    userId: number,
    commandText?: string,
  ): Promise<MasterFundVinachainResponse> {
    try {
      // Lấy thông tin Master Fund
      const result = await this.masterFundVinachainService.getMasterFundInfo();

      if (!result.success || !result.data) {
        await this.discordWebhook.auditWebhook(
          'MasterFund API response error',
          result.message || getMessage(BotMessages.ERROR_GENERAL),
          {
            chatId,
            userId,
            commandText: commandText || '',
            apiResponse: result,
          },
        );
        return {
          success: false,
          message: result.message || getMessage(BotMessages.ERROR_GENERAL),
        };
      }

      // Kiểm tra quyền truy cập
      const isAuthorized =
        this.masterFundVinachainService.isAuthorizedUser(chatId);

      // Lấy thông tin user để xác định role
      const user = await this.authService.findByTelegramId(userId);
      const userRole = user?.role;

      // Tạo message
      const message = this.masterFundVinachainService.buildMasterFundMessage(
        result.data.balance,
        result.data.currency,
        result.data.wallets,
        isAuthorized,
        userRole,
      );

      // Tạo keyboard dựa trên role
      let keyboard;
      if (userRole === 'USER' || userRole === 'ADVANCED_USER') {
        // User và Advanced User: keyboard cho partner wallet
        const partnerWalletAddress =
          this.masterFundVinachainService.getPartnerWalletAddress();
        keyboard =
          MessageBuilder.buildCopyPartnerWalletKeyboard(partnerWalletAddress);
      }
      // Admin và Dev: không có keyboard (có thể copy trực tiếp từ text)

      this.logger.log('Success: true', message);
      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      this.logger.error('Error in handleMasterFundVinachainCommand:', error);
      await this.discordWebhook.auditWebhook(
        'Exception in handleMasterFundVinachainCommand',
        'Unexpected exception occurred in MasterFund flow',
        {
          chatId,
          userId,
          commandText: commandText || '',
          error: (error as any)?.message || String(error),
        },
      );
      return {
        success: false,
        message: getMessage(BotMessages.ERROR_GENERAL),
      };
    }
  }
}
