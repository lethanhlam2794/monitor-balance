// Import required libraries
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';

// Import services and schemas
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
 * Manage balance checking on BSC network
 */
@Module({
  imports: [
    // HttpModule cho Etherscan API calls
    HttpModule,
    // MongooseModule for Reminder and Partner schemas
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
  ], // Export for other modules to use
})
export class BalanceBscModule {}
