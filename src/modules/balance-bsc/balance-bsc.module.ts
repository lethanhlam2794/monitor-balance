// Import các thư viện cần thiết
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';

// Import services và schemas
import { EtherscanService } from './etherscan.service';
import { ReminderService } from './services/reminder.service';
import { BuyCardService } from './services/buy-card.service';
import { BuyCardControllerService } from './controllers/buy-card.controller';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { BullQueueModule } from '../bull/bull-queue.module';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

/**
 * Balance BSC Module
 * Quản lý việc kiểm tra balance trên BSC network
 */
@Module({
  imports: [
    // HttpModule cho Etherscan API calls
    HttpModule,
    // MongooseModule cho Reminder schema
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
    ]),
    // Bull Queue Module
    BullQueueModule,
    // Cache Module for Redis caching
    CacheModule.register(),
  ],
  providers: [
    EtherscanService,
    ReminderService,
    BuyCardService,
    BuyCardControllerService,
    DiscordWebhookService,
  ],
  exports: [
    EtherscanService,
    ReminderService,
    BuyCardService,
    BuyCardControllerService,
    DiscordWebhookService,
  ], // Export để các module khác có thể sử dụng
})
export class BalanceBscModule {}
