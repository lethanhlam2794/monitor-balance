import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BalanceMonitoringQueueService } from './modules/bull/services/balance-monitoring-queue.service';
import { PartnerService } from './modules/balance-bsc/services/partner.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private balanceMonitoringQueueService: BalanceMonitoringQueueService,
    private partnerService: PartnerService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing Bull Queue reminders...');
      await this.balanceMonitoringQueueService.initializeReminders();
      this.logger.log('Bull Queue reminders initialized successfully');

      this.logger.log('Initializing default partner...');
      await this.partnerService.initializeDefaultPartner();
      this.logger.log('Default partner initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing services:', error);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
