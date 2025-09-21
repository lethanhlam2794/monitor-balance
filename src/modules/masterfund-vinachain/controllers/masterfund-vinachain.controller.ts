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
      // Lấy thông tin Master Fund
      const result = await this.masterFundVinachainService.getMasterFundInfo();

      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || getMessage(BotMessages.ERROR_GENERAL),
        };
      }

      // Kiểm tra quyền truy cập
      const isAuthorized = this.masterFundVinachainService.isAuthorizedUser(chatId);

      // Lấy thông tin user để xác định role
      const user = await this.authService.findByTelegramId(userId);
      const userRole = user?.role;

      // Tạo message
      const message = this.masterFundVinachainService.buildMasterFundMessage(
        result.data.balance,
        result.data.currency,
        result.data.wallets,
        isAuthorized,
        userRole
      );

      // Tạo keyboard dựa trên role
      let keyboard;
      if (userRole === 'ADMIN' || userRole === 'DEV') {
        // Admin và Dev: keyboard cho tất cả wallets + partner wallet
        keyboard = MessageBuilder.buildCopyMultipleWalletsKeyboard(result.data.wallets);
      } else {
        // User và Advanced User: chỉ keyboard cho partner wallet
        keyboard = MessageBuilder.buildCopyPartnerWalletKeyboard();
      }

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