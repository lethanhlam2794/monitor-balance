// Import các thư viện cần thiết
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import model và service
import { AuthService } from './auth.service';
import { UserModel, userSchema } from './auth.model';

/**
 * Auth Module
 * Quản lý authentication và authorization
 */
@Module({
  imports: [
    // Đăng ký UserModel với Mongoose
    MongooseModule.forFeature([
      { name: UserModel.name, schema: userSchema }
    ]),
  ],
  providers: [AuthService],
  exports: [AuthService], // Export để các module khác có thể sử dụng
})
export class AuthModule {}
