// Import các thư viện cần thiết
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

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
import {
  getMessage,
  BotMessages,
  getRegularMessageResponse,
} from '@shared/enums/bot-messages.enum';
import { ERR_CODE } from '@shared/constants';
import { UserRole, ROLE_DESCRIPTIONS } from '../auth/enums/user-role.enum';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

// Sử dụng type có sẵn từ node-telegram-bot-api
type TelegramMessage = TelegramBot.Message;

// Constants
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_THRESHOLD = 1000000;

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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private discordWebhookService: DiscordWebhookService,
  ) {
    this.initializeBot();
  }

  /**
   * Khởi tạo Telegram Bot
   */
  private initializeBot(): void {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.error(
        'TELEGRAM_BOT_TOKEN not found in environment variables',
      );
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
      await this.sendMessage(
        msg.chat.id,
        getMessage(BotMessages.ERROR_GENERAL),
      );
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

      case BotCommands.OFF_MONITOR_BUY_CARD:
        await this.handleOffMonitorBuyCardCommand(chatId, userId);
        break;

      case BotCommands.OFF_MONITOR_MASTER_FUND:
        await this.handleOffMonitorMasterFundCommand(chatId, userId);
        break;

      default:
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_UNSUPPORTED_COMMAND),
        );
    }
  }

  /**
   * Xử lý command /start
   */
  private async handleStartCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    await this.sendMessage(chatId, getMessage(BotMessages.WELCOME));
  }

  /**
   * Xử lý command /help - hiển thị help dựa trên role
   */
  private async handleHelpCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    const user = await this.authService.findByTelegramId(userId);

    if (!user) {
      await this.sendMessage(
        chatId,
        getMessage(BotMessages.ERROR_USER_NOT_FOUND),
      );
      return;
    }

    const hasAdvanced = await this.authService.hasPermission(
      userId,
      UserRole.ADVANCED_USER,
    );
    const hasAdmin = await this.authService.hasPermission(
      userId,
      UserRole.ADMIN,
    );
    const hasDev = await this.authService.hasPermission(userId, UserRole.DEV);

    const helpMessage = MessageBuilder.buildHelpMessage(
      ROLE_DESCRIPTIONS[user.role],
      hasAdvanced,
      hasAdmin,
      hasDev,
    );

    await this.sendMessage(chatId, helpMessage);
  }

  /**
   * Xử lý command /profile
   */
  private async handleProfileCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    const user = await this.authService.findByTelegramId(userId);

    if (!user) {
      await this.sendMessage(
        chatId,
        getMessage(BotMessages.ERROR_USER_NOT_FOUND),
      );
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
      user.isActive,
    );

    await this.sendMessage(chatId, profileMessage);
  }

  /**
   * Xử lý command /admin
   */
  private async handleAdminCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    const hasPermission = await this.authService.hasPermission(
      userId,
      UserRole.ADMIN,
    );

    if (!hasPermission) {
      await this.sendMessage(
        chatId,
        getMessage(BotMessages.ERROR_NO_PERMISSION),
      );
      return;
    }

    await this.sendMessage(chatId, getMessage(BotMessages.ADMIN_PANEL));
  }

  /**
   * Xử lý command /stats
   */
  private async handleStatsCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    const hasPermission = await this.authService.hasPermission(
      userId,
      UserRole.ADMIN,
    );

    if (!hasPermission) {
      await this.sendMessage(
        chatId,
        getMessage(BotMessages.ERROR_NO_PERMISSION),
      );
      return;
    }

    const stats = await this.authService.getUserStats();

    const statsMessage = MessageBuilder.buildStatsMessage(
      stats.total,
      stats.activeToday,
      stats.byRole[UserRole.DEV],
      stats.byRole[UserRole.ADMIN],
      stats.byRole[UserRole.ADVANCED_USER],
      stats.byRole[UserRole.USER],
    );

    await this.sendMessage(chatId, statsMessage);
  }

  /**
   * Xử lý command /view_buycard
   */
  private async handleViewBuyCardCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      await this.sendMessage(chatId, getMessage(BotMessages.BUY_CARD_LOADING));

      const result =
        await this.buyCardControllerService.handleViewBuyCardCommand();

      if (result.success) {
        this.logger.log('Success: true', result.message);
        await this.sendMessageWithKeyboard(chatId, result.message);
      } else {
        await this.sendMessage(chatId, result.message);
      }
    } catch (error) {
      this.logger.error('Error in handleViewBuyCardCommand:', error);
      await this.sendMessage(
        chatId,
        getMessage(BotMessages.ERROR_BALANCE_CHECK_FAILED),
      );
    }
  }
  /**
   * Xử lý command /monitor_buy_card - Hiển thị inline keyboard để chọn ngưỡng
   */
  private async handleMonitorBuyCardCommand(
    chatId: number,
    userId: number,
    commandText?: string,
  ): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_USER_NOT_FOUND),
        );
        return;
      }

      const message = `🔔 *Set Alert Threshold When*

Choose alert threshold for Buy Card Fund:

Bot will send notifications when Buy Card Fund balance drops below the selected threshold\\.`;

      await this.sendMessageWithKeyboard(
        chatId,
        message,
        this.createBuyCardThresholdKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in handleMonitorBuyCardCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  /**
   * Xử lý command /masterfund_vinachain
   */
  private async handleMasterFundVinachainCommand(
    chatId: number,
    userId: number,
    commandText?: string,
  ): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_USER_NOT_FOUND),
        );
        return;
      }

      // Gửi loading message
      const loadingMsg = await this.sendMessage(
        chatId,
        'Loading Master Fund information...',
      );

      const result =
        await this.masterFundVinachainControllerService.handleMasterFundVinachainCommand(
          chatId,
          userId,
          commandText,
        );

      if (result.success) {
        this.logger.log('Success: true', result.message);
        // Edit loading message với kết quả
        await this.bot.editMessageText(result.message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'MarkdownV2',
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
   * Xử lý command /monitor_master_fund - Hiển thị inline keyboard để chọn ngưỡng
   */
  private async handleMonitorMasterFundCommand(
    chatId: number,
    userId: number,
    commandText?: string,
  ): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_USER_NOT_FOUND),
        );
        return;
      }

      const message = `🔔 *Set Alert Threshold When*

Choose alert threshold for Master Fund:

Bot will send notifications when Master Fund balance drops below the selected threshold\\.`;

      await this.sendMessageWithKeyboard(
        chatId,
        message,
        this.createMasterFundThresholdKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in handleMonitorMasterFundCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private getMasterFundMonitorHelpMessage(): string {
    return `**Set Master Fund Monitoring Reminder**

**Syntax:** \`/monitor_master_fund\`

Use this command to choose alert threshold from menu or enter custom number.

**Operation:**
• Bot checks balance at selected frequency (10, 15, or 30 minutes)
• Send notifications when balance < set threshold
• Uses Redis cache for performance optimization`;
  }

  /**
   * Xử lý command /off_monitor_buy_card - Tắt nhắc nhở kiểm tra balance
   */
  private async handleOffMonitorBuyCardCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_USER_NOT_FOUND),
        );
        return;
      }

      const result = await this.buyCardControllerService.setReminder(
        userId,
        0,
        30,
      );
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleOffMonitorBuyCardCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  /**
   * Xử lý command /off_monitor_master_fund - Tắt nhắc nhở kiểm tra Master Fund
   */
  private async handleOffMonitorMasterFundCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      const user = await this.authService.findByTelegramId(userId);
      if (!user) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_USER_NOT_FOUND),
        );
        return;
      }

      const success =
        await this.masterFundMonitoringService.addMasterFundReminder(
          userId,
          0,
          15,
        );
      const message = success
        ? '✅ Master Fund monitoring reminder disabled successfully!'
        : '❌ No Master Fund reminder found to disable!';

      await this.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Error in handleOffMonitorMasterFundCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  /**
   * Xử lý message thường (không phải command)
   */
  private async handleRegularMessage(msg: TelegramMessage): Promise<void> {
    const userId = msg.from?.id;
    const text = msg.text || '';

    if (!userId) return;

    // Kiểm tra xem user có đang chờ nhập threshold tùy chỉnh không
    const isWaitingThreshold = await this.cacheManager.get<boolean>(
      `waiting_threshold:${userId}`,
    );
    const isWaitingMasterThreshold = await this.cacheManager.get<boolean>(
      `waiting_master_threshold:${userId}`,
    );

    if (isWaitingThreshold) {
      await this.handleCustomThresholdInput(msg.chat.id, userId, text);
      return;
    }

    if (isWaitingMasterThreshold) {
      await this.handleMasterCustomThresholdInput(msg.chat.id, userId, text);
      return;
    }

    // Xử lý message thường
    const response = getRegularMessageResponse(text);
    await this.sendMessage(msg.chat.id, response);
  }

  /**
   * Xử lý callback query từ inline keyboard
   */
  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery,
  ): Promise<void> {
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
        case 'threshold_200':
          await this.handleThresholdSelection(chatId, userId, 200);
          break;
        case 'threshold_500':
          await this.handleThresholdSelection(chatId, userId, 500);
          break;
        case 'threshold_1000':
          await this.handleThresholdSelection(chatId, userId, 1000);
          break;
        case 'threshold_custom':
          await this.handleCustomThresholdRequest(chatId, userId);
          break;
        case 'threshold_cancel':
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Alert setup cancelled',
            show_alert: false,
          });
          await this.handleHelpCommand(chatId, userId);
          break;
        case 'master_threshold_500':
          await this.handleMasterThresholdSelection(chatId, userId, 500);
          break;
        case 'master_threshold_1000':
          await this.handleMasterThresholdSelection(chatId, userId, 1000);
          break;
        case 'master_threshold_1500':
          await this.handleMasterThresholdSelection(chatId, userId, 1500);
          break;
        case 'master_threshold_custom':
          await this.handleMasterCustomThresholdRequest(chatId, userId);
          break;
        case 'master_threshold_cancel':
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Alert setup cancelled',
            show_alert: false,
          });
          await this.handleHelpCommand(chatId, userId);
          break;
        case 'master_interval_10':
          await this.handleMasterIntervalSelection(chatId, userId, 10);
          break;
        case 'master_interval_15':
          await this.handleMasterIntervalSelection(chatId, userId, 15);
          break;
        case 'master_interval_30':
          await this.handleMasterIntervalSelection(chatId, userId, 30);
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
    options?: TelegramBot.SendMessageOptions,
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
    keyboard?: TelegramBot.InlineKeyboardMarkup,
  ): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error(
        `Error sending message with keyboard to ${chatId}:`,
        error,
      );
      await this.discordWebhookService.auditWebhook(
        'Bot Error: Send Message with Keyboard',
        `Failed to send message with keyboard to user ${chatId}`,
        {
          chatId,
          error: (error as any)?.message || String(error),
          timestamp: new Date(),
        },
      );
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

  // Helper methods for keyboards
  private createBuyCardThresholdKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '200 USDT', callback_data: 'threshold_200' },
          { text: '500 USDT', callback_data: 'threshold_500' },
        ],
        [
          { text: '1000 USDT', callback_data: 'threshold_1000' },
          { text: 'Other', callback_data: 'threshold_custom' },
        ],
        [{ text: '❌ Cancel Setup', callback_data: 'threshold_cancel' }],
      ],
    };
  }

  private createMasterFundThresholdKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '500 USDT', callback_data: 'master_threshold_500' },
          { text: '1000 USDT', callback_data: 'master_threshold_1000' },
        ],
        [
          { text: '1500 USDT', callback_data: 'master_threshold_1500' },
          { text: 'Other', callback_data: 'master_threshold_custom' },
        ],
        [
          {
            text: '❌ Cancel Setup',
            callback_data: 'master_threshold_cancel',
          },
        ],
      ],
    };
  }

  private createIntervalKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '10 min', callback_data: 'master_interval_10' },
          { text: '15 min', callback_data: 'master_interval_15' },
        ],
        [{ text: '30 min', callback_data: 'master_interval_30' }],
      ],
    };
  }

  // Helper methods for validation
  private validateThreshold(threshold: number): string | null {
    if (isNaN(threshold) || threshold <= 0) {
      return '❌ Invalid number! Please enter a positive number \\(e\\.g\\.: 1500\\)';
    }
    if (threshold > MAX_THRESHOLD) {
      return '❌ Threshold too large! Please enter a number less than 1,000,000 USDT';
    }
    return null;
  }

  private parseThresholdInput(input: string): number {
    return parseFloat(input.replace(/[^\d.]/g, ''));
  }

  // Threshold handlers
  private async handleThresholdSelection(
    chatId: number,
    userId: number,
    threshold: number,
  ): Promise<void> {
    try {
      const result = await this.buyCardControllerService.setReminder(
        userId,
        threshold,
        30,
      );
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleThresholdSelection:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleCustomThresholdRequest(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(
        `waiting_threshold:${userId}`,
        true,
        CACHE_TIMEOUT,
      );
      await this.sendMessage(
        chatId,
        `*Enter Custom Threshold*

Please enter USDT amount for alert threshold \\(e\\.g\\.: 1500\\)

Bot will send notifications when Buy Card Fund balance drops below this threshold\\.`,
      );
    } catch (error) {
      this.logger.error('Error in handleCustomThresholdRequest:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleCustomThresholdInput(
    chatId: number,
    userId: number,
    input: string,
  ): Promise<void> {
    try {
      await this.cacheManager.del(`waiting_threshold:${userId}`);
      const threshold = this.parseThresholdInput(input);

      const validationError = this.validateThreshold(threshold);
      if (validationError) {
        await this.sendMessage(chatId, validationError);
        return;
      }

      const result = await this.buyCardControllerService.setReminder(
        userId,
        threshold,
        30,
      );
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleCustomThresholdInput:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleMasterThresholdSelection(
    chatId: number,
    userId: number,
    threshold: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(
        `master_threshold:${userId}`,
        threshold,
        CACHE_TIMEOUT,
      );
      const message = `*Choose Check Interval*

Threshold: ${threshold} USDT

Select check frequency:`;

      await this.sendMessageWithKeyboard(
        chatId,
        message,
        this.createIntervalKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in handleMasterThresholdSelection:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleMasterCustomThresholdRequest(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(
        `waiting_master_threshold:${userId}`,
        true,
        CACHE_TIMEOUT,
      );
      await this.sendMessage(
        chatId,
        `*Enter Custom Threshold for Master Fund*

Please enter USDT amount for alert threshold \\(e\\.g\\.: 2000\\)

Bot will send notifications when Master Fund balance drops below this threshold\\.`,
      );
    } catch (error) {
      this.logger.error('Error in handleMasterCustomThresholdRequest:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleMasterIntervalSelection(
    chatId: number,
    userId: number,
    intervalMinutes: number,
  ): Promise<void> {
    try {
      const threshold = await this.cacheManager.get<number>(
        `master_threshold:${userId}`,
      );

      if (!threshold) {
        await this.sendMessage(
          chatId,
          '❌ Timeout expired. Please start again.',
        );
        return;
      }

      await this.cacheManager.del(`master_threshold:${userId}`);
      const success =
        await this.masterFundMonitoringService.addMasterFundReminder(
          userId,
          threshold,
          intervalMinutes,
        );

      const message = success
        ? `**✅ Master Fund reminder set successfully!**

**Alert Threshold:** ${threshold} USDT
**Check Interval:** ${intervalMinutes} minutes
**Status:** Active

Bot will automatically check Master Fund balance and send alerts when balance < ${threshold} USDT\\.`
        : '❌ Error occurred while setting Master Fund reminder!';

      await this.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Error in handleMasterIntervalSelection:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

  private async handleMasterCustomThresholdInput(
    chatId: number,
    userId: number,
    input: string,
  ): Promise<void> {
    try {
      await this.cacheManager.del(`waiting_master_threshold:${userId}`);
      const threshold = this.parseThresholdInput(input);

      const validationError = this.validateThreshold(threshold);
      if (validationError) {
        await this.sendMessage(chatId, validationError.replace('1500', '2000'));
        return;
      }

      await this.cacheManager.set(
        `master_threshold:${userId}`,
        threshold,
        CACHE_TIMEOUT,
      );
      const message = `*Choose Check Interval*

Threshold: ${threshold} USDT

Select check frequency:`;

      await this.sendMessageWithKeyboard(
        chatId,
        message,
        this.createIntervalKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in handleMasterCustomThresholdInput:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }
}
