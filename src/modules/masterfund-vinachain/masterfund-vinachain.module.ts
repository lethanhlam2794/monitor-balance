import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MasterFundVinachainService } from './services/masterfund-vinachain.service';
import { MasterFundVinachainControllerService } from './controllers/masterfund-vinachain.controller';
import { AuthModule } from '../auth/auth.module';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

@Module({
  imports: [AuthModule, HttpModule],
  providers: [
    MasterFundVinachainService,
    MasterFundVinachainControllerService,
    DiscordWebhookService,
  ],
  exports: [MasterFundVinachainService, MasterFundVinachainControllerService],
})
export class MasterFundVinachainModule {}
