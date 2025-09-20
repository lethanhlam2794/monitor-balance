import { Module } from '@nestjs/common';
import { MasterFundVinachainService } from './services/masterfund-vinachain.service';
import { MasterFundVinachainControllerService } from './controllers/masterfund-vinachain.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    MasterFundVinachainService,
    MasterFundVinachainControllerService,
  ],
  exports: [
    MasterFundVinachainService,
    MasterFundVinachainControllerService,
  ],
})
export class MasterFundVinachainModule {}
