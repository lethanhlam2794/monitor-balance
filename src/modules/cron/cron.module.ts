import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { BalanceMonitoringService } from './services/balance-monitoring.service';
import { MasterFundMonitoringService } from './services/master-fund-monitoring.service';
import { BalanceBscModule } from '../balance-bsc/balance-bsc.module';
import { MasterFundVinachainModule } from '../masterfund-vinachain/masterfund-vinachain.module';
import { BotTelegramModule } from '../bot-telegram/bot-telegram.module';
import { AuthModule } from '../auth/auth.module';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    BalanceBscModule,
    MasterFundVinachainModule,
    forwardRef(() => BotTelegramModule),
    AuthModule,
    CacheModule.register(),
  ],
  providers: [
    BalanceMonitoringService,
    MasterFundMonitoringService,
    DiscordWebhookService,
  ],
  exports: [BalanceMonitoringService, MasterFundMonitoringService],
})
export class CronModule {}
