// Import các thư viện cần thiết
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Import Telegram Bot API
import TelegramBot from 'node-telegram-bot-api';

// Import services và models
import { AuthService } from '../auth/auth.service';
import { UserModel, UserDocument } from '../auth/auth.model';
import { BuyCardControllerService } from '../balance-bsc/controllers/buy-card.controller';
import { MasterFundVinachainControllerService } from '../masterfund-vinachain/controllers/masterfund-vinachain.controller';
import { MasterFundMonitoringService } from '../cron/services/master-fund-monitoring.service';
import { MessageBuilder } from '@shared/message_builder';
import { BotCommands } from '@shared/enums/bot-commands.enum';
import { getMessage, BotMessages, getRegularMessageResponse } from '@shared/enums/bot-messages.enum';
import { ERR_CODE } from '@shared/constants';
import { UserRole, ROLE_DESCRIPTIONS } from '../auth/enums/user-role.enum';

// Sử dụng type có sẵn từ node-telegram-bot-api
type TelegramMessage = TelegramBot.Message;

/**
 * Service xử lý Telegram Bot
 * Quản lý commands, messages và tích hợp với hệ thống auth
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private buyCardControllerService: BuyCardControllerService,
    private masterFundVinachainControllerService: MasterFundVinachainControllerService,
    @Inject(forwardRef(() => MasterFundMonitoringService))
    private masterFundMonitoringService: MasterFundMonitoringService,
    @InjectModel(UserModel.name) private userModel: Model<UserDocument>,
  ) {
    this.initializeBot();
  }

  /**
   * Khởi tạo Telegram Bot
   */
  private initializeBot(): void {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.setupEventHandlers();
    this.logger.log('Telegram Bot initialized successfully');
  }

  /**
   * Thiết lập các event handlers cho bot
   */
  private setupEventHandlers(): void {
    // Xử lý lỗi
    this.bot.on('error', (error) => {
      this.logger.error('Telegram Bot Error:', error);
    });

    // Xử lý polling error
    this.bot.on('polling_error', (error) => {
      this.logger.error('Telegram Bot Polling Error:', error);
    });

    // Xử lý message mới
    this.bot.on('message', async (msg: TelegramMessage) => {
      await this.handleMessage(msg);
    });

    // Xử lý callback query (inline keyboard)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }


  private async handleMessage(msg: TelegramMessage): Promise<void> {
    try {
      // Lưu/cập nhật thông tin user vào database
      if (msg.from) {
        await this.authService.createOrUpdateUser({
          telegramId: msg.from.id,
          username: msg.from.username,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
          languageCode: msg.from.language_code,
        });
      }

      // Xử lý commands
      if (msg.text?.startsWith('/')) {
        await this.handleCommand(msg);
      } else {
        // Xử lý message thường
        await this.handleRegularMessage(msg);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      await this.sendMessage(msg.chat.id, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

 
  private async handleCommand(msg: TelegramMessage): Promise<void> {
    const command = msg.text?.split(' ')[0].toLowerCase();
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;

    switch (command) {
      case BotCommands.START:
        await this.handleStartCommand(chatId, userId);
        break;
      
      case BotCommands.HELP:
        await this.handleHelpCommand(chatId, userId);
        break;
      
      case BotCommands.PROFILE:
        await this.handleProfileCommand(chatId, userId);
        break;
      
      case BotCommands.ADMIN:
        await this.handleAdminCommand(chatId, userId);
        break;
      
      case BotCommands.STATS:
        await this.handleStatsCommand(chatId, userId);
        break;
      
      case BotCommands.VIEW_BUYCARD:
        await this.handleViewBuyCardCommand(chatId, userId);
        break;
      
     case BotCommands.MONITOR_BUY_CARD:
        await this.handleMonitorBuyCardCommand(chatId, userId, msg.text);
        break;  
      
     case BotCommands.MASTERFUND_VINACHAIN:
        await this.handleMasterFundVinachainCommand(chatId, userId, msg.text);
        break;

     case BotCommands.MONITOR_MASTER_FUND:
        await this.handleMonitorMasterFundCommand(chatId, userId, msg.text);
        break;

      default:
        await this.sendMessage(chatId, getMessage(BotMessages.ERROR_UNSUPPORTED_COMMAND));
    }
  }

  /**
   * Xử lý command /start
   */
  private async handleStartCommand(chatId: number, userId: number): Promise<void> {
    await this.sendMessage(chatId, getMessage(BotMessages.WELCOME));
  }

  /**
   * Xử lý command /help - hiển thị help dựa trên role
   */
  private async handleHelpCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.authService.findByTelegramId(userId);
    
    if (!user) {
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_USER_NOT_FOUND));
      return;
    }

    const hasAdvanced = await this.authService.hasPermission(userId, UserRole.ADVANCED_USER);
    const hasAdmin = await this.authService.hasPermission(userId, UserRole.ADMIN);
    const hasDev = await this.authService.hasPermission(userId, UserRole.DEV);

    const helpMessage = MessageBuilder.buildHelpMessage(
      ROLE_DESCRIPTIONS[user.role],
      hasAdvanced,
      hasAdmin,
      hasDev
    );

    await this.sendMessage(chatId, helpMessage);
  }

  /**
   * Xử lý command /profile
   */
  private async handleProfileCommand(chatId: number, userId: number): Promise<void> {
    const user = await this.authService.findByTelegramId(userId);
    
    if (!user) {
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_USER_NOT_FOUND));
      return;
    }

    const profileMessage = MessageBuilder.buildProfileMessage(
      user.telegramId,
      user.firstName || '',
      user.lastName || '',
      user.username || '',
      user.languageCode || '',
      ROLE_DESCRIPTIONS[user.role],
      user.createdAt,
      user.lastActiveAt,
      user.isActive
    );

    await this.sendMessage(chatId, profileMessage);
  }

  /**
   * Xử lý command /admin
   */
  private async handleAdminCommand(chatId: number, userId: number): Promise<void> {
    const hasPermission = await this.authService.hasPermission(userId, UserRole.ADMIN);
    
    if (!hasPermission) {
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_NO_PERMISSION));
      return;
    }

    await this.sendMessage(chatId, getMessage(BotMessages.ADMIN_PANEL));
  }

  /**
   * Xử lý command /stats
   */
  private async handleStatsCommand(chatId: number, userId: number): Promise<void> {
    const hasPermission = await this.authService.hasPermission(userId, UserRole.ADMIN);
    
    if (!hasPermission) {
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_NO_PERMISSION));
      return;
    }

    const stats = await this.authService.getUserStats();
    
    const statsMessage = MessageBuilder.buildStatsMessage(
      stats.total,
      stats.activeToday,
      stats.byRole[UserRole.DEV],
      stats.byRole[UserRole.ADMIN],
      stats.byRole[UserRole.ADVANCED_USER],
      stats.byRole[UserRole.USER]
    );

    await this.sendMessage(chatId, statsMessage);
  }

  /**
   * Xử lý command /view_buycard
   */
  private async handleViewBuyCardCommand(chatId: number, userId: number): Promise<void> {
    try {
      await this.sendMessage(chatId, getMessage(BotMessages.BUY_CARD_LOADING));

      const result = await this.buyCardControllerService.handleViewBuyCardCommand();

      if (result.success) {
        this.logger.log('Success: true', result.message);
        await this.sendMessageWithKeyboard(chatId, result.message);
      } else {
        await this.sendMessage(chatId, result.message);
      }
    } catch (error) {
      this.logger.error('Error in handleViewBuyCardCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_BALANCE_CHECK_FAILED));
    }
  }
  /**
   * Xử lý command /monitor_buy_card - Đặt lịch nhắc kiểm tra balance
   * Cú pháp: /monitor_buy_card <threshold> [interval_minutes]
   * Ví dụ: /monitor_buy_card 300 15
   */
  private async handleMonitorBuyCardCommand(chatId: number, userId: number, commandText?: string): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(chatId, getMessage(BotMessages.ERROR_USER_NOT_FOUND));
        return;
      }

      const result = await this.buyCardControllerService.handleMonitorBuyCardCommand(userId, commandText);
      if (result.success) {
        this.logger.log('Success: true', result.message);
      }
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleMonitorBuyCardCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  /**
   * Xử lý command /masterfund_vinachain
   */
  private async handleMasterFundVinachainCommand(chatId: number, userId: number, commandText?: string): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(chatId, getMessage(BotMessages.ERROR_USER_NOT_FOUND));
        return;
      }

      // Gửi loading message
      const loadingMsg = await this.sendMessage(chatId, 'Loading Master Fund information...');

      const result = await this.masterFundVinachainControllerService.handleMasterFundVinachainCommand(chatId, userId, commandText);
      
      if (result.success) {
        this.logger.log('Success: true', result.message);
        // Edit loading message với kết quả
        await this.bot.editMessageText(result.message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'MarkdownV2'
        });
      } else {
        await this.sendMessage(chatId, result.message);
      }
    } catch (error) {
      this.logger.error('Error in handleMasterFundVinachainCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  /**
   * Xử lý command /monitor_master_fund
   */
  private async handleMonitorMasterFundCommand(chatId: number, userId: number, commandText?: string): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(chatId, getMessage(BotMessages.ERROR_USER_NOT_FOUND));
        return;
      }

      // Parse command arguments
      const args = commandText?.split(' ').slice(1) || [];
      
      if (args.length === 0) {
        // Show help message
        const helpMessage = this.getMasterFundMonitorHelpMessage();
        this.logger.log('Success: true', helpMessage);
        await this.sendMessage(chatId, helpMessage);
        return;
      }

      const threshold = parseFloat(args[0]);
      const intervalMinutes = args[1] ? parseInt(args[1]) : 15;

      const success = await this.masterFundMonitoringService.addMasterFundReminder(userId, threshold, intervalMinutes);
      
      if (success) {
        if (threshold === 0) {
          this.logger.log('Success: true', 'Master Fund monitoring reminder disabled');
          await this.sendMessage(chatId, 'Master Fund monitoring reminder disabled successfully!');
        } else {
          this.logger.log('Success: true', `Master Fund monitoring reminder set: threshold ${threshold}, interval ${intervalMinutes} minutes`);
          await this.sendMessage(chatId, `**Master Fund Reminder Set Successfully!**

**Alert Threshold:** ${threshold} USDT
**Check Interval:** ${intervalMinutes} minutes
**Status:** Active

Bot will automatically check Master Fund balance and send alerts when balance < ${threshold} USDT.`);
        }
      } else {
        await this.sendMessage(chatId, 'Error: Invalid parameters. Please check your input.');
      }
    } catch (error) {
      this.logger.error('Error in handleMonitorMasterFundCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private getMasterFundMonitorHelpMessage(): string {
    return `**Set Master Fund Monitoring Reminder**

**Syntax:** \`/monitor_master_fund <threshold> [interval_minutes]\`

**Examples:**
• \`/monitor_master_fund 2000\` - Alert when balance < 2000 USDT (every 15 minutes)
• \`/monitor_master_fund 3000 30\` - Alert when balance < 3000 USDT (every 30 minutes)
• \`/monitor_master_fund 0\` - Disable reminder`;
  }

  /**
   * Xử lý message thường (không phải command)
   */
  private async handleRegularMessage(msg: TelegramMessage): Promise<void> {
    // Có thể thêm logic xử lý message thường ở đây
    // Ví dụ: AI chat, keyword detection, etc.
    
    const response = getRegularMessageResponse(msg.text || '');
    await this.sendMessage(msg.chat.id, response);
  }

  /**
   * Xử lý callback query từ inline keyboard
   */
  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data;
      const userId = callbackQuery.from.id;
      
      if (!chatId) return;

      // Xử lý các callback data khác nhau
      switch (data) {
        case 'help':
          await this.handleHelpCommand(chatId, userId);
          break;
        case 'profile':
          await this.handleProfileCommand(chatId, userId);
          break;
        default:
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: getMessage(BotMessages.CALLBACK_FEATURE_DEVELOPING),
            show_alert: true,
          });
      }

      // Xác nhận đã xử lý callback
      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      this.logger.error('Error handling callback query:', error);
    }
  }

 

  async sendMessage(
    chatId: number, 
    text: string, 
    options?: TelegramBot.SendMessageOptions
  ): Promise<TelegramBot.Message> {
    try {
      // Mặc định không dùng Markdown để tránh lỗi parse
      return await this.bot.sendMessage(chatId, text, {
        parse_mode: undefined,
        ...options,
      });
    } catch (error) {
      this.logger.error(`Error sending message to ${chatId}:`, error);
      throw error;
    }
  }


  async sendMessageWithKeyboard(
    chatId: number,
    text: string,
    keyboard?: TelegramBot.InlineKeyboardMarkup
  ): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error(`Error sending message with keyboard to ${chatId}:`, error);
    }
  }

  /**
   * Lấy thông tin bot
   */
  async getBotInfo(): Promise<TelegramBot.User> {
    try {
      return await this.bot.getMe();
    } catch (error) {
      this.logger.error('Error getting bot info:', error);
      throw error;
    }
  }
}
