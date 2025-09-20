import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Import modules
import { AuthModule } from './modules/auth/auth.module';
import { BotTelegramModule } from './modules/bot-telegram/bot-telegram.module';
import { MasterFundVinachainModule } from './modules/masterfund-vinachain/masterfund-vinachain.module';
import { CronModule } from './modules/cron/cron.module';

// Import app components
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true, // Làm cho ConfigModule có thể sử dụng ở mọi nơi
      envFilePath: '.env', // Đường dẫn đến file .env
    }),
    
    // Database
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegrambot'),
    
    // Schedule
    ScheduleModule.forRoot(),
    
    // Feature modules
    AuthModule,
    BotTelegramModule,
    MasterFundVinachainModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
