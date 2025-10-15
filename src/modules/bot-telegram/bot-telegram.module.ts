// Import required libraries
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';

// Import model, service and controller
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { UserModel, userSchema } from '../auth/auth.model';

// Import modules
import { AuthModule } from '../auth/auth.module';
import { BalanceBscModule } from '../balance-bsc/balance-bsc.module';
import { MasterFundVinachainModule } from '../masterfund-vinachain/masterfund-vinachain.module';
import { CronModule } from '../cron/cron.module';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

/**
 * Bot Telegram Module
 * Manage Telegram Bot functionality
 */
@Module({
  imports: [
    // Import AuthModule to use AuthService
    AuthModule,
    // Import BalanceBscModule to use EtherscanService
    BalanceBscModule,
    // Import MasterFundVinachainModule to use MasterFundVinachainControllerService
    MasterFundVinachainModule,
    // Import CronModule to use MasterFundMonitoringService
    forwardRef(() => CronModule),
    // Import CacheModule to use Redis cache
    CacheModule.register(),
    // Import HttpModule to use DiscordWebhookService
    HttpModule,
    // Register UserModel with Mongoose
    MongooseModule.forFeature([{ name: UserModel.name, schema: userSchema }]),
  ],
  controllers: [BotController],
  providers: [BotService, DiscordWebhookService],
  exports: [BotService], // Export to be used elsewhere
})
export class BotTelegramModule {}
