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
import { PartnerControllerService } from '../balance-bsc/controllers/partner.controller';
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
    private partnerControllerService: PartnerControllerService,
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

      case BotCommands.SPAM:
        await this.handleSpamCommand(chatId, userId, msg.text);
        break;

      case BotCommands.PARTNERS:
        await this.handlePartnersCommand(chatId, userId);
        break;

      case BotCommands.ADD_PARTNER:
        await this.handleAddPartnerCommand(chatId, userId, msg.text);
        break;

      case BotCommands.EDIT_PARTNER:
        await this.handleEditPartnerCommand(chatId, userId, msg.text);
        break;

      case BotCommands.DELETE_PARTNER:
        await this.handleDeletePartnerCommand(chatId, userId, msg.text);
        break;

      case BotCommands.CLEAR_CACHE:
        await this.handleClearCacheCommand(chatId, userId, msg.text);
        break;

      case BotCommands.API_STATUS:
        await this.handleApiStatusCommand(chatId, userId);
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

      // Lấy thông tin user để xác định role
      const user = await this.authService.findByTelegramId(userId);
      const userRole = user?.role;

      const result =
        await this.buyCardControllerService.handleViewBuyCardCommand(userRole);

      if (result.success) {
        this.logger.log(`Keyboard: ${JSON.stringify(result.keyboard)}`);
        await this.sendMessageWithKeyboard(
          chatId,
          result.message,
          result.keyboard,
        );
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
   * Xử lý command /monitor_buy_card - Đặt lịch nhắc kiểm tra balance
   * Hiển thị inline keyboard để chọn ngưỡng
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

      const message = `🔔 *Set alert threshold when*

Choose alert threshold for Buy Card Fund:

Bot will send notification when Buy Card Fund balance drops below selected threshold\\.`;

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
        // Edit loading message với kết quả và keyboard
        await this.bot.editMessageText(result.message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'MarkdownV2',
          reply_markup: result.keyboard,
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

      const message = `🔔 *Set alert threshold when*

Choose alert threshold for Master Fund:

Bot will send notification when Master Fund balance drops below selected threshold\\.`;

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
    return `**Đặt nhắc nhở kiểm tra số dư Master Fund**

**Cú pháp:** \`/monitor_master_fund\`

Sử dụng lệnh này để chọn ngưỡng cảnh báo từ menu hoặc nhập số tùy chỉnh.

**Hoạt động:**
• Bot kiểm tra số dư theo tần suất đã chọn (10, 15, hoặc 30 phút)
• Gửi thông báo khi số dư < ngưỡng đã đặt
• Sử dụng Redis cache để tối ưu hiệu suất`;
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

      // Gọi service để tắt reminder
      const result = await this.buyCardControllerService.setReminder(
        userId,
        0,
        30,
      );

      if (result.success) {
        await this.sendMessage(chatId, result.message);
      } else {
        await this.sendMessage(chatId, result.message);
      }
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

      // Gọi service để tắt reminder Master Fund
      const success =
        await this.masterFundMonitoringService.addMasterFundReminder(
          userId,
          0,
          15,
        );

      if (success) {
        await this.sendMessage(
          chatId,
          '✅ Master Fund monitoring reminder disabled successfully!',
        );
      } else {
        await this.sendMessage(
          chatId,
          '❌ No Master Fund monitoring reminder found to disable!',
        );
      }
    } catch (error) {
      this.logger.error('Error in handleOffMonitorMasterFundCommand:', error);
      await this.sendMessage(chatId, getMessage(BotMessages.ERROR_GENERAL));
    }
  }

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
        `*Enter custom threshold*

Please enter USDT amount for alert threshold \\(example: 1500\\)

Bot will send notification when Buy Card Fund balance drops below this threshold\\.`,
      );
    } catch (error) {
      this.logger.error('Error in handleCustomThresholdRequest:', error);
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
    const isAddingPartner = await this.cacheManager.get<any>(
      `adding_partner:${userId}`,
    );

    if (isWaitingThreshold) {
      await this.handleCustomThresholdInput(msg.chat.id, userId, text);
      return;
    }

    if (isWaitingMasterThreshold) {
      await this.handleMasterCustomThresholdInput(msg.chat.id, userId, text);
      return;
    }

    if (isAddingPartner) {
      await this.handlePartnerCreationStep(
        msg.chat.id,
        userId,
        text,
        isAddingPartner,
      );
      return;
    }

    // Xử lý message thường
    const response = getRegularMessageResponse(text);
    await this.sendMessage(msg.chat.id, response);
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
      const message = `*Choose check interval*

Threshold: ${threshold} USDT

Choose check frequency:`;

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
        `*Enter custom threshold for Master Fund*

Please enter USDT amount for alert threshold \\(example: 2000\\)

Bot will send notification when Master Fund balance drops below this threshold\\.`,
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
        await this.sendMessage(chatId, '❌ Timeout. Please start again.');
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
        ? `**✅ Master Fund monitoring reminder set successfully!**

**Alert Threshold:** ${threshold} USDT
**Check Interval:** ${intervalMinutes} minutes
**Status:** Active

Bot will automatically check Master Fund balance and send alert when balance < ${threshold} USDT\\.`
        : '❌ Error occurred while setting Master Fund monitoring reminder!';

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
      const message = `*Choose check interval*

Threshold: ${threshold} USDT

Choose check frequency:`;

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
            text: 'Setup cancelled',
            show_alert: false,
          });
          // Gửi lại lệnh help
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
            text: 'Setup cancelled',
            show_alert: false,
          });
          // Gửi lại lệnh help
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
          // Xử lý callback cho partner selection
          if (data?.startsWith('view_partner_')) {
            const partnerName = data.replace('view_partner_', '');
            await this.handleViewPartnerCallback(
              chatId,
              userId,
              partnerName,
              callbackQuery.id,
            );
          } else {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: getMessage(BotMessages.CALLBACK_FEATURE_DEVELOPING),
              show_alert: true,
            });
          }
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

      // Log audit cho lỗi gửi message
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
        [{ text: '❌ Cancel setup', callback_data: 'threshold_cancel' }],
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
            text: '❌ Cancel setup',
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
      return '❌ Invalid number! Please enter a positive number \\(example: 1500\\)';
    }
    if (threshold > MAX_THRESHOLD) {
      return '❌ Threshold too large! Please enter a number less than 1,000,000 USDT';
    }
    return null;
  }

  private parseThresholdInput(input: string): number {
    return parseFloat(input.replace(/[^\d.]/g, ''));
  }

  /**
   * Handle /spam command - Spam call API Buy Card (Dev only)
   */
  private async handleSpamCommand(
    chatId: number,
    userId: number,
    messageText?: string,
  ): Promise<void> {
    try {
      // Check if user is DEV
      const user = await this.authService.findByTelegramId(userId);
      if (!user || user.role !== UserRole.DEV) {
        await this.sendMessage(
          chatId,
          '❌ Only Developers can use this command!',
        );
        return;
      }

      // Parse spam parameters
      const args = messageText?.split(' ').slice(1) || [];
      const count = parseInt(args[0]) || 10; // Default 10 calls
      const delay = parseInt(args[1]) || 1000; // Default 1 second delay

      if (count > 100) {
        await this.sendMessage(chatId, '❌ Spam count cannot exceed 100!');
        return;
      }

      if (delay < 100) {
        await this.sendMessage(chatId, '❌ Delay cannot be less than 100ms!');
        return;
      }

      await this.sendMessage(
        chatId,
        `🚀 Starting Buy Card API spam...\n` +
          `📊 Count: ${count}\n` +
          `⏱️ Delay: ${delay}ms\n` +
          `⏰ Started at: ${new Date().toLocaleString('en-US')}`,
      );

      let successCount = 0;
      let errorCount = 0;
      const startTime = Date.now();

      // Spam API calls
      for (let i = 1; i <= count; i++) {
        try {
          const result =
            await this.buyCardControllerService.handleViewBuyCardCommand();

          if (result.success) {
            successCount++;
            this.logger.log(`Spam call ${i}/${count}: Success`);
          } else {
            errorCount++;
            this.logger.warn(
              `Spam call ${i}/${count}: Failed - ${result.message}`,
            );
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Spam call ${i}/${count}: Error - ${error.message}`,
          );
        }

        // Delay between calls
        if (i < count) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Send results
      const resultMessage =
        `✅ Spam completed!\n\n` +
        `📊 Results:\n` +
        `   • Success: ${successCount}/${count}\n` +
        `   • Errors: ${errorCount}/${count}\n` +
        `   • Success rate: ${((successCount / count) * 100).toFixed(1)}%\n\n` +
        `⏱️ Time:\n` +
        `   • Total time: ${(totalTime / 1000).toFixed(2)}s\n` +
        `   • Average time/call: ${(totalTime / count).toFixed(0)}ms\n` +
        `   • Delay between calls: ${delay}ms\n\n` +
        `⏰ Ended at: ${new Date().toLocaleString('en-US')}`;

      await this.sendMessage(chatId, resultMessage);
    } catch (error) {
      this.logger.error('Error in handleSpamCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while executing spam command!',
      );
    }
  }

  /**
   * Xử lý lệnh /partners
   */
  private async handlePartnersCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      const result =
        await this.partnerControllerService.handlePartnersCommand();

      if (result.success) {
        await this.sendMessageWithKeyboard(
          chatId,
          result.message,
          result.keyboard,
        );
      } else {
        await this.sendMessage(chatId, result.message);
      }
    } catch (error) {
      this.logger.error('Error in handlePartnersCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while processing partners command!',
      );
    }
  }

  /**
   * Xử lý lệnh /add_partner - Bắt đầu flow tạo partner từng bước
   */
  private async handleAddPartnerCommand(
    chatId: number,
    userId: number,
    messageText?: string,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      // Bắt đầu flow tạo partner từng bước
      await this.cacheManager.set(
        `adding_partner:${userId}`,
        { step: 'name' },
        CACHE_TIMEOUT,
      );

      await this.sendMessage(
        chatId,
        '🆕 **Add New Partner**\n\n' +
          '**Step 1/3: Enter partner ID name**\n\n' +
          'Please enter ID name for partner \\(no spaces, only letters, numbers and underscores\\)\n\n' +
          '**Examples:** `partner_a`, `vinachain_v2`, `new_partner`\n\n' +
          '💡 This name will be used as unique ID for partner\\.',
      );
    } catch (error) {
      this.logger.error('Error in handleAddPartnerCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while starting partner creation!',
      );
    }
  }

  /**
   * Xử lý lệnh /edit_partner
   */
  private async handleEditPartnerCommand(
    chatId: number,
    userId: number,
    messageText?: string,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      const result =
        await this.partnerControllerService.handleEditPartnerCommand(
          messageText,
        );
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleEditPartnerCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while editing partner!',
      );
    }
  }

  /**
   * Xử lý lệnh /delete_partner
   */
  private async handleDeletePartnerCommand(
    chatId: number,
    userId: number,
    messageText?: string,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      const result =
        await this.partnerControllerService.handleDeletePartnerCommand(
          messageText,
        );
      await this.sendMessage(chatId, result.message);
    } catch (error) {
      this.logger.error('Error in handleDeletePartnerCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while deleting partner!',
      );
    }
  }

  /**
   * Xử lý lệnh /clear_cache
   */
  private async handleClearCacheCommand(
    chatId: number,
    userId: number,
    messageText?: string,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      const args = messageText?.split(' ').slice(1) || [];

      if (args.length === 0) {
        // Clear tất cả cache
        await this.buyCardControllerService.clearAllBalanceCache();
        await this.sendMessage(
          chatId,
          '✅ **All balance cache cleared successfully!**\n\nCache will be refreshed on next request.',
        );
      } else if (args.length === 1) {
        // Clear cache cho một partner cụ thể
        const partnerName = args[0];
        const partner =
          await this.partnerControllerService.getPartnerByName(partnerName);

        if (!partner) {
          await this.sendMessage(
            chatId,
            `❌ Partner with name "${partnerName}" not found!`,
          );
          return;
        }

        await this.buyCardControllerService.clearBalanceCache(
          partner.walletAddress,
          partner.contractAddress,
          partner.chainId,
        );

        await this.sendMessage(
          chatId,
          `✅ **Cache cleared for partner "${partner.displayName}" successfully!**\n\nCache will be refreshed on next request.`,
        );
      } else {
        await this.sendMessage(
          chatId,
          '**Usage:**\n\n' +
            '• `/clear_cache` - Clear all cache\n' +
            '• `/clear_cache <partner_name>` - Clear cache for specific partner\n\n' +
            '**Examples:**\n' +
            '• `/clear_cache`\n' +
            '• `/clear_cache vinachain`',
        );
      }
    } catch (error) {
      this.logger.error('Error in handleClearCacheCommand:', error);
      await this.sendMessage(chatId, '❌ Error occurred while clearing cache!');
    }
  }

  /**
   * Xử lý lệnh /api_status
   */
  private async handleApiStatusCommand(
    chatId: number,
    userId: number,
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdmin = await this.authService.hasPermission(
        userId,
        UserRole.ADMIN,
      );
      if (!hasAdmin) {
        await this.sendMessage(
          chatId,
          getMessage(BotMessages.ERROR_NO_PERMISSION),
        );
        return;
      }

      const apiStatus = await this.buyCardControllerService.getApiKeyStatus();

      const message =
        '📊 **API Keys Status**\n\n' +
        `**Primary Key:** \`${apiStatus.primaryKey}\`\n` +
        `**Fallback Key:** \`${apiStatus.fallbackKey}\`\n\n` +
        `**Error Count:**\n` +
        `• Primary: ${apiStatus.primaryErrors}\n` +
        `• Fallback: ${apiStatus.fallbackErrors}\n\n` +
        `**Status:** ${apiStatus.primaryErrors > 0 || apiStatus.fallbackErrors > 0 ? '⚠️ Has errors' : '✅ Working normally'}`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Error in handleApiStatusCommand:', error);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while getting API status!',
      );
    }
  }

  /**
   * Xử lý callback khi user chọn partner để xem balance
   */
  private async handleViewPartnerCallback(
    chatId: number,
    userId: number,
    partnerName: string,
    callbackQueryId: string,
  ): Promise<void> {
    try {
      // Lấy thông tin user role
      const user = await this.authService.findByTelegramId(userId);
      const userRole = user?.role;

      // Gọi controller để xử lý
      const result =
        await this.buyCardControllerService.handleViewBuyCardForPartner(
          partnerName,
          userRole,
        );

      if (result.success) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'Balance information loaded',
          show_alert: false,
        });

        this.logger.log(
          `Partner callback keyboard: ${JSON.stringify(result.keyboard)}`,
        );
        await this.sendMessageWithKeyboard(
          chatId,
          result.message,
          result.keyboard,
        );
      } else {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: result.message,
          show_alert: true,
        });
      }
    } catch (error) {
      this.logger.error('Error in handleViewPartnerCallback:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'Error occurred while viewing balance',
        show_alert: true,
      });
    }
  }

  /**
   * Xử lý từng bước tạo partner
   */
  private async handlePartnerCreationStep(
    chatId: number,
    userId: number,
    input: string,
    partnerData: any,
  ): Promise<void> {
    try {
      const { step, name, displayName } = partnerData;

      switch (step) {
        case 'name':
          // Validate tên ID
          if (!/^[a-zA-Z0-9_]+$/.test(input)) {
            await this.sendMessage(
              chatId,
              '❌ **Invalid ID name!**\n\n' +
                'ID name can only contain letters, numbers and underscores.\n' +
                '**Examples:** `partner_a`, `vinachain_v2`\n\n' +
                'Please enter again:',
            );
            return;
          }

          // Kiểm tra tên đã tồn tại chưa
          const existingPartner =
            await this.partnerControllerService.getPartnerByName(input);
          if (existingPartner) {
            await this.sendMessage(
              chatId,
              `❌ **ID name "${input}" already exists!**\n\n` +
                'Please choose a different ID name:',
            );
            return;
          }

          // Chuyển sang bước 2
          await this.cacheManager.set(
            `adding_partner:${userId}`,
            { step: 'displayName', name: input },
            CACHE_TIMEOUT,
          );

          await this.sendMessage(
            chatId,
            '✅ **Step 1 completed\\!**\n\n' +
              `**ID Name:** \`${input}\`\n\n` +
              '**Step 2/3: Enter display name**\n\n' +
              'Please enter display name for partner \\(can have spaces and special characters\\)\n\n' +
              '**Examples:** `Partner A`, `Vinachain V2`, `New Partner`\n\n' +
              '💡 This name will be displayed to users when selecting partner\\.',
          );
          break;

        case 'displayName':
          // Validate tên hiển thị
          if (input.trim().length < 2) {
            await this.sendMessage(
              chatId,
              '❌ **Display name too short!**\n\n' +
                'Display name must have at least 2 characters.\n\n' +
                'Please enter again:',
            );
            return;
          }

          // Chuyển sang bước 3
          await this.cacheManager.set(
            `adding_partner:${userId}`,
            { step: 'walletAddress', name, displayName: input.trim() },
            CACHE_TIMEOUT,
          );

          await this.sendMessage(
            chatId,
            '✅ **Step 2 completed\\!**\n\n' +
              `**ID Name:** \`${name}\`\n` +
              `**Display Name:** ${displayName}\n\n` +
              '**Step 3/3: Enter wallet address**\n\n' +
              'Please enter blockchain wallet address \\(starts with 0x\\)\n\n' +
              '**Example:** `0x1234567890abcdef1234567890abcdef12345678`\n\n' +
              '💡 This address will be used to check balance\\.',
          );
          break;

        case 'walletAddress':
          // Validate địa chỉ ví
          if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
            await this.sendMessage(
              chatId,
              '❌ **Invalid wallet address!**\n\n' +
                'Wallet address must start with 0x and have 40 hex characters.\n' +
                '**Example:** `0x1234567890abcdef1234567890abcdef12345678`\n\n' +
                'Please enter again:',
            );
            return;
          }

          // Tạo partner
          const result = await this.partnerControllerService.createPartner({
            name,
            displayName,
            walletAddress: input,
          });

          // Xóa cache
          await this.cacheManager.del(`adding_partner:${userId}`);

          if (result.success) {
            await this.sendMessage(
              chatId,
              '🎉 **Partner created successfully\\!**\n\n' +
                `**ID Name:** \`${name}\`\n` +
                `**Display Name:** ${displayName}\n` +
                `**Wallet Address:** \`${input}\`\n` +
                `**Token:** USDT \\(default\\)\n` +
                `**Chain:** BSC \\(56\\)\n\n` +
                '✅ Partner has been added to system and ready to use\\!',
            );
          } else {
            await this.sendMessage(chatId, result.message);
          }
          break;

        default:
          await this.cacheManager.del(`adding_partner:${userId}`);
          await this.sendMessage(
            chatId,
            '❌ Error occurred during partner creation process!',
          );
      }
    } catch (error) {
      this.logger.error('Error in handlePartnerCreationStep:', error);
      await this.cacheManager.del(`adding_partner:${userId}`);
      await this.sendMessage(
        chatId,
        '❌ Error occurred while creating partner!',
      );
    }
  }
}
