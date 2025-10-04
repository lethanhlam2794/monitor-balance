import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BalanceMonitoringQueueService } from './modules/bull/services/balance-monitoring-queue.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private balanceMonitoringQueueService: BalanceMonitoringQueueService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing Bull Queue reminders...');
      await this.balanceMonitoringQueueService.initializeReminders();
      this.logger.log('Bull Queue reminders initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Bull Queue reminders:', error);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
