import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BalanceMonitoringProcessor } from './queues/balance-monitoring.queue';
import { BalanceMonitoringQueueService } from './services/balance-monitoring-queue.service';
import { BalanceBscModule } from '../balance-bsc/balance-bsc.module';
import { BotTelegramModule } from '../bot-telegram/bot-telegram.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'balance-monitoring',
    }),
    BalanceBscModule,
    BotTelegramModule,
  ],
  providers: [
    BalanceMonitoringProcessor,
    BalanceMonitoringQueueService,
  ],
  exports: [
    BalanceMonitoringQueueService,
  ],
})
export class BullQueueModule {}
