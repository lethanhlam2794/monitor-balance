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
import { PartnerControllerService } from './controllers/partner.controller';
import { PartnerService } from './services/partner.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { Partner, PartnerSchema } from './schemas/partner.schema';
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
    // MongooseModule cho Reminder và Partner schemas
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Partner.name, schema: PartnerSchema },
    ]),
    // Bull Queue Module
    BullQueueModule,
    // Cache Module cho Redis caching
    CacheModule.register(),
  ],
  providers: [
    EtherscanService,
    ReminderService,
    BuyCardService,
    BuyCardControllerService,
    PartnerService,
    PartnerControllerService,
    DiscordWebhookService,
  ],
  exports: [
    EtherscanService,
    ReminderService,
    BuyCardService,
    BuyCardControllerService,
    PartnerService,
    PartnerControllerService,
    DiscordWebhookService,
  ], // Export để các module khác có thể sử dụng
})
export class BalanceBscModule {}
