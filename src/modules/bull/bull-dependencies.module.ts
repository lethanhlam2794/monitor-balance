import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Reminder, ReminderSchema } from '../balance-bsc/schemas/reminder.schema';
import { EtherscanService } from '../balance-bsc/etherscan.service';
import { ReminderService } from '../balance-bsc/services/reminder.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema }
    ]),
  ],
  providers: [
    EtherscanService,
    ReminderService,
  ],
  exports: [
    EtherscanService,
    ReminderService,
  ],
})
export class BullDependenciesModule {}
