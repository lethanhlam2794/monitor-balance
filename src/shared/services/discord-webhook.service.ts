import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger(DiscordWebhookService.name);
  private readonly webhookUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('DISCORD_WEBHOOK_URL') || '';
    if (!this.webhookUrl) {
      this.logger.warn('DISCORD_WEBHOOK_URL not found in environment variables');
    }
  }

  /**
   * Gửi thông báo lỗi API đến Discord
   */
  async sendApiErrorNotification(
    errorDetails: {
      primaryApiKey: string;
      fallbackApiKey: string;
      errorMessage: string;
      affectedUsers: Array<{
        telegramId: number;
        threshold: number;
        intervalMinutes: number;
        lastCheckedAt: Date | null;
        alertCount: number;
      }>;
      timestamp: Date;
    }
  ): Promise<void> {
    try {
      if (!this.webhookUrl) {
        this.logger.warn('Discord webhook URL not configured, skipping notification');
        return;
      }

      const embed = {
        title: '🚨 Etherscan API Error Alert',
        color: 0xff0000, // Red color
        fields: [
          {
            name: 'Primary API Key',
            value: `\`${errorDetails.primaryApiKey.substring(0, 8)}...\``,
            inline: true,
          },
          {
            name: 'Fallback API Key',
            value: `\`${errorDetails.fallbackApiKey.substring(0, 8)}...\``,
            inline: true,
          },
          {
            name: 'Error Message',
            value: `\`${errorDetails.errorMessage}\``,
            inline: false,
          },
          {
            name: 'Affected Users',
            value: errorDetails.affectedUsers.length.toString(),
            inline: true,
          },
          {
            name: 'Timestamp',
            value: `<t:${Math.floor(errorDetails.timestamp.getTime() / 1000)}:F>`,
            inline: true,
          },
        ],
        footer: {
          text: 'Telegram Bot Monitoring System',
        },
        timestamp: errorDetails.timestamp.toISOString(),
      };

      // Thêm chi tiết từng user nếu có ít hơn 10 users
      if (errorDetails.affectedUsers.length <= 10) {
        const userDetails = errorDetails.affectedUsers.map((user, index) => {
          return `${index + 1}. **User ${user.telegramId}**\n` +
                 `   - Threshold: ${user.threshold} USDT\n` +
                 `   - Interval: ${user.intervalMinutes}min\n` +
                 `   - Last Checked: ${user.lastCheckedAt ? new Date(user.lastCheckedAt).toLocaleString() : 'Never'}\n` +
                 `   - Alert Count: ${user.alertCount}`;
        }).join('\n\n');

        embed.fields.push({
          name: 'User Details',
          value: userDetails,
          inline: false,
        });
      } else {
        embed.fields.push({
          name: 'User Details',
          value: `Too many users (${errorDetails.affectedUsers.length}). Check logs for full details.`,
          inline: false,
        });
      }

      const payload = {
        embeds: [embed],
      };

      await firstValueFrom(
        this.httpService.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log('Discord notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Discord notification:', error);
    }
  }

  /**
   * Gửi thông báo API recovery
   */
  async sendApiRecoveryNotification(
    apiKey: string,
    recoveryTime: Date,
    affectedUsersCount: number
  ): Promise<void> {
    try {
      if (!this.webhookUrl) {
        this.logger.warn('Discord webhook URL not configured, skipping notification');
        return;
      }

      const embed = {
        title: '✅ Etherscan API Recovery',
        color: 0x00ff00, // Green color
        fields: [
          {
            name: 'Working API Key',
            value: `\`${apiKey.substring(0, 8)}...\``,
            inline: true,
          },
          {
            name: 'Recovery Time',
            value: `<t:${Math.floor(recoveryTime.getTime() / 1000)}:F>`,
            inline: true,
          },
          {
            name: 'Affected Users',
            value: affectedUsersCount.toString(),
            inline: true,
          },
        ],
        footer: {
          text: 'Telegram Bot Monitoring System',
        },
        timestamp: recoveryTime.toISOString(),
      };

      const payload = {
        embeds: [embed],
      };

      await firstValueFrom(
        this.httpService.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log('Discord recovery notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Discord recovery notification:', error);
    }
  }
}
