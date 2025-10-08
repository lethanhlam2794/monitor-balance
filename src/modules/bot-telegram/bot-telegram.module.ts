// Import các thư viện cần thiết
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';

// Import model, service và controller
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
 * Quản lý Telegram Bot functionality
 */
@Module({
  imports: [
    // Import AuthModule để sử dụng AuthService
    AuthModule,
    // Import BalanceBscModule để sử dụng EtherscanService
    BalanceBscModule,
    // Import MasterFundVinachainModule để sử dụng MasterFundVinachainControllerService
    MasterFundVinachainModule,
    // Import CronModule để sử dụng MasterFundMonitoringService
    forwardRef(() => CronModule),
    // Import CacheModule để sử dụng Redis cache
    CacheModule.register(),
    // Import HttpModule để sử dụng DiscordWebhookService
    HttpModule,
    // Đăng ký UserModel với Mongoose
    MongooseModule.forFeature([{ name: UserModel.name, schema: userSchema }]),
  ],
  controllers: [BotController],
  providers: [BotService, DiscordWebhookService],
  exports: [BotService], // Export để có thể sử dụng ở nơi khác
})
export class BotTelegramModule {}
