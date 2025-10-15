// Import required libraries
import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

// Import services
import { BotService } from './bot.service';
import { AuthService } from '../auth/auth.service';

// Import DTOs
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

/**
 * Controller handling API endpoints for Telegram Bot
 * Provides REST API to interact with bot from web interface
 */
@ApiTags('Telegram Bot')
@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(
    private readonly botService: BotService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Webhook endpoint to receive updates from Telegram
   * @param update - Telegram update object
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Telegram Bot' })
  @ApiBody({ description: 'Telegram update object' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  async handleWebhook(@Body() update: any): Promise<{ status: string }> {
    try {
      this.logger.log(
        'Received webhook update:',
        JSON.stringify(update, null, 2),
      );

      // Process update through BotService
      if (update.message) {
        await this.botService['handleMessage'](update.message);
      } else if (update.callback_query) {
        await this.botService['handleCallbackQuery'](update.callback_query);
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return { status: 'error' };
    }
  }

  /**
   * Send message to user via Telegram
   * @param sendMessageDto - DTO containing message information
   */
  @Post('send-message')
  @ApiOperation({ summary: 'Send message to user via Telegram' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { chatId, text, parseMode, replyMarkup } = sendMessageDto;

      await this.botService.sendMessage(chatId, text, {
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });

      this.logger.log(`Message sent to chat ${chatId}`);
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { success: false, message: 'Failed to send message' };
    }
  }

  /**
   * Get bot information
   */
  @Get('info')
  @ApiOperation({ summary: 'Get bot information' })
  @ApiResponse({ status: 200, description: 'Bot info retrieved successfully' })
  async getBotInfo(): Promise<any> {
    try {
      const botInfo = await this.botService.getBotInfo();
      return { success: true, data: botInfo };
    } catch (error) {
      this.logger.error('Error getting bot info:', error);
      return { success: false, message: 'Failed to get bot info' };
    }
  }

  /**
   * Get user information by Telegram ID
   * @param telegramId - User's Telegram ID
   */
  @Get('user/:telegramId')
  @ApiOperation({ summary: 'Get user information by Telegram ID' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserInfo(@Param('telegramId') telegramId: string): Promise<any> {
    try {
      const user = await this.authService.findByTelegramId(
        parseInt(telegramId),
      );

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, data: user };
    } catch (error) {
      this.logger.error('Error getting user info:', error);
      return { success: false, message: 'Failed to get user info' };
    }
  }

  /**
   * Update user role
   * @param updateUserRoleDto - DTO containing role update information
   */
  @Post('user/update-role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateUserRole(
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { adminTelegramId, targetTelegramId, newRole } = updateUserRoleDto;

      const success = await this.authService.updateUserRole(
        adminTelegramId,
        targetTelegramId,
        newRole,
      );

      if (success) {
        this.logger.log(
          `User ${targetTelegramId} role updated to ${newRole} by ${adminTelegramId}`,
        );
        return { success: true, message: 'User role updated successfully' };
      } else {
        return {
          success: false,
          message: 'Failed to update user role or insufficient permissions',
        };
      }
    } catch (error) {
      this.logger.error('Error updating user role:', error);
      return { success: false, message: 'Failed to update user role' };
    }
  }

  /**
   * Get users list by role
   * @param role - Role to filter
   */
  @Get('users')
  @ApiOperation({ summary: 'Get users list by role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query('role') role?: string): Promise<any> {
    try {
      let users;

      if (role) {
        users = await this.authService.getUsersByRole(role as any);
      } else {
        // Get all users (may need to add method in AuthService)
        users = await this.authService['userModel']
          .find({ isActive: true })
          .exec();
      }

      return { success: true, data: users };
    } catch (error) {
      this.logger.error('Error getting users:', error);
      return { success: false, message: 'Failed to get users' };
    }
  }

  /**
   * Get system statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats(): Promise<any> {
    try {
      const stats = await this.authService.getUserStats();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      return { success: false, message: 'Failed to get stats' };
    }
  }

  /**
   * Broadcast message to all users
   * @param broadcastDto - DTO containing broadcast information
   */
  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast message to all users' })
  @ApiBody({ description: 'Broadcast message data' })
  @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
  async broadcastMessage(
    @Body() broadcastDto: { text: string; role?: string },
  ): Promise<any> {
    try {
      const { text, role } = broadcastDto;

      // Get users list for broadcast
      let users;
      if (role) {
        users = await this.authService.getUsersByRole(role as any);
      } else {
        users = await this.authService['userModel']
          .find({ isActive: true })
          .exec();
      }

      // Send message to each user
      const results: {
        telegramId: number;
        status: 'success' | 'failed';
        error?: string;
      }[] = [];
      for (const user of users) {
        try {
          await this.botService.sendMessage(user.telegramId, text);
          results.push({ telegramId: user.telegramId, status: 'success' });
        } catch (error) {
          results.push({
            telegramId: user.telegramId,
            status: 'failed',
            error: (error as Error).message,
          });
        }
      }

      this.logger.log(`Broadcast sent to ${users.length} users`);
      return {
        success: true,
        message: `Broadcast sent to ${users.length} users`,
        results,
      };
    } catch (error) {
      this.logger.error('Error broadcasting message:', error);
      return { success: false, message: 'Failed to broadcast message' };
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check cho bot service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
