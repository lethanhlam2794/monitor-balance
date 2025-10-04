import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BalanceMonitoringProcessor } from './queues/balance-monitoring.queue';
import { BalanceMonitoringQueueService } from './services/balance-monitoring-queue.service';
import { BullDependenciesModule } from './bull-dependencies.module';
import { BotTelegramModule } from '../bot-telegram/bot-telegram.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'balance-monitoring',
    }),
    BullDependenciesModule,
    forwardRef(() => BotTelegramModule),
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
