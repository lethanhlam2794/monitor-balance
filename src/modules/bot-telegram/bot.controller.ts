// Import các thư viện cần thiết
import { Controller, Post, Body, Logger, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

// Import services
import { BotService } from './bot.service';
import { AuthService } from '../auth/auth.service';

// Import DTOs
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

/**
 * Controller xử lý các API endpoints cho Telegram Bot
 * Cung cấp REST API để tương tác với bot từ web interface
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
   * Webhook endpoint để nhận updates từ Telegram
   * @param update - Telegram update object
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint cho Telegram Bot' })
  @ApiBody({ description: 'Telegram update object' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  async handleWebhook(@Body() update: any): Promise<{ status: string }> {
    try {
      this.logger.log('Received webhook update:', JSON.stringify(update, null, 2));
      
      // Xử lý update thông qua BotService
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
   * Gửi message đến user qua Telegram
   * @param sendMessageDto - DTO chứa thông tin message
   */
  @Post('send-message')
  @ApiOperation({ summary: 'Gửi message đến user qua Telegram' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto): Promise<{ success: boolean; message: string }> {
    try {
      const { chatId, text, parseMode, replyMarkup } = sendMessageDto;
      
      await this.botService.sendMessage(chatId, text, {
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });

      this.logger.log(`Message sent to chat ${chatId}`);
      return { success: true, message: 'Tin nhắn đã được gửi thành công' };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { success: false, message: 'Không thể gửi tin nhắn' };
    }
  }

  /**
   * Lấy thông tin bot
   */
  @Get('info')
  @ApiOperation({ summary: 'Lấy thông tin bot' })
  @ApiResponse({ status: 200, description: 'Bot info retrieved successfully' })
  async getBotInfo(): Promise<any> {
    try {
      const botInfo = await this.botService.getBotInfo();
      return { success: true, data: botInfo };
    } catch (error) {
      this.logger.error('Error getting bot info:', error);
      return { success: false, message: 'Không thể lấy thông tin bot' };
    }
  }

  /**
   * Lấy thông tin user theo Telegram ID
   * @param telegramId - Telegram ID của user
   */
  @Get('user/:telegramId')
  @ApiOperation({ summary: 'Lấy thông tin user theo Telegram ID' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserInfo(@Param('telegramId') telegramId: string): Promise<any> {
    try {
      const user = await this.authService.findByTelegramId(parseInt(telegramId));
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, data: user };
    } catch (error) {
      this.logger.error('Error getting user info:', error);
      return { success: false, message: 'Không thể lấy thông tin user' };
    }
  }

  /**
   * Cập nhật role của user
   * @param updateUserRoleDto - DTO chứa thông tin cập nhật role
   */
  @Post('user/update-role')
  @ApiOperation({ summary: 'Cập nhật role của user' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateUserRole(@Body() updateUserRoleDto: UpdateUserRoleDto): Promise<{ success: boolean; message: string }> {
    try {
      const { adminTelegramId, targetTelegramId, newRole } = updateUserRoleDto;
      
      const success = await this.authService.updateUserRole(
        adminTelegramId,
        targetTelegramId,
        newRole
      );

      if (success) {
        this.logger.log(`User ${targetTelegramId} role updated to ${newRole} by ${adminTelegramId}`);
        return { success: true, message: 'Cập nhật role user thành công' };
      } else {
        return { success: false, message: 'Không thể cập nhật role user hoặc không đủ quyền' };
      }
    } catch (error) {
      this.logger.error('Error updating user role:', error);
      return { success: false, message: 'Không thể cập nhật role user' };
    }
  }

  /**
   * Lấy danh sách users theo role
   * @param role - Role cần lọc
   */
  @Get('users')
  @ApiOperation({ summary: 'Lấy danh sách users theo role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query('role') role?: string): Promise<any> {
    try {
      let users;
      
      if (role) {
        users = await this.authService.getUsersByRole(role as any);
      } else {
        // Lấy tất cả users (có thể cần thêm method trong AuthService)
        users = await this.authService['userModel'].find({ isActive: true }).exec();
      }

      return { success: true, data: users };
    } catch (error) {
      this.logger.error('Error getting users:', error);
      return { success: false, message: 'Không thể lấy danh sách users' };
    }
  }

  /**
   * Lấy thống kê hệ thống
   */
  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê hệ thống' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats(): Promise<any> {
    try {
      const stats = await this.authService.getUserStats();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      return { success: false, message: 'Không thể lấy thống kê' };
    }
  }

  /**
   * Broadcast message đến tất cả users
   * @param broadcastDto - DTO chứa thông tin broadcast
   */
  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast message đến tất cả users' })
  @ApiBody({ description: 'Broadcast message data' })
  @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
  async broadcastMessage(@Body() broadcastDto: { text: string; role?: string }): Promise<any> {
    try {
      const { text, role } = broadcastDto;
      
      // Lấy danh sách users để broadcast
      let users;
      if (role) {
        users = await this.authService.getUsersByRole(role as any);
      } else {
        users = await this.authService['userModel'].find({ isActive: true }).exec();
      }

      // Gửi message đến từng user
      const results: { telegramId: number; status: 'success' | 'failed'; error?: string }[] = [];
      for (const user of users) {
        try {
          await this.botService.sendMessage(user.telegramId, text);
          results.push({ telegramId: user.telegramId, status: 'success' });
        } catch (error) {
          results.push({ telegramId: user.telegramId, status: 'failed', error: (error as Error).message });
        }
      }

      this.logger.log(`Broadcast sent to ${users.length} users`);
      return { 
        success: true, 
        message: `Broadcast sent to ${users.length} users`,
        results 
      };
    } catch (error) {
      this.logger.error('Error broadcasting message:', error);
      return { success: false, message: 'Không thể gửi tin nhắn broadcast' };
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
