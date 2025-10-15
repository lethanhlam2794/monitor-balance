import { Injectable, Logger } from "@nestjs/common";
import { BotMessages, getMessage } from "@shared/enums/bot-messages.enum";
import { MasterFundVinachainService } from "../services/masterfund-vinachain.service";
import { AuthService } from "../../auth/auth.service";
import { MessageBuilder } from "@shared/message_builder";



interface MasterFundVinachainResponse {
  success: boolean;
  message: string;
  keyboard?: any;
}

@Injectable()
export class MasterFundVinachainControllerService {
  private readonly logger = new Logger(MasterFundVinachainControllerService.name);

  constructor(
    private masterFundVinachainService: MasterFundVinachainService,
    private authService: AuthService,
  ) {}

  async handleMasterFundVinachainCommand(chatId: number, userId: number, commandText?: string): Promise<MasterFundVinachainResponse> {
    try {
      // Get Master Fund information
      const result = await this.masterFundVinachainService.getMasterFundInfo();

      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || getMessage(BotMessages.ERROR_GENERAL),
        };
      }

      // Check access permissions
      const isAuthorized = this.masterFundVinachainService.isAuthorizedUser(chatId);

      // Get user information to determine role
      const user = await this.authService.findByTelegramId(userId);
      const userRole = user?.role;

      // Create message
      const message = this.masterFundVinachainService.buildMasterFundMessage(
        result.data.balance,
        result.data.currency,
        result.data.wallets,
        isAuthorized,
        userRole
      );

      // Create keyboard based on role
      let keyboard;
      if (userRole === 'USER' || userRole === 'ADVANCED_USER') {
        // User and Advanced User: keyboard for partner wallet
        const partnerWalletAddress = this.masterFundVinachainService.getPartnerWalletAddress();
        keyboard = MessageBuilder.buildCopyPartnerWalletKeyboard(partnerWalletAddress);
      }
      // Admin and Dev: no keyboard (can copy directly from text)

      this.logger.log('Success: true', message);
      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      this.logger.error('Error in handleMasterFundVinachainCommand:', error);
      return {
        success: false,
        message: getMessage(BotMessages.ERROR_GENERAL),
      };
    }
  }
}   