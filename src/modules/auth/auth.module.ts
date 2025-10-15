// Import required libraries
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import model and service
import { AuthService } from './auth.service';
import { UserModel, userSchema } from './auth.model';

/**
 * Auth Module
 * Manage authentication and authorization
 */
@Module({
  imports: [
    // Register UserModel with Mongoose
    MongooseModule.forFeature([
      { name: UserModel.name, schema: userSchema }
    ]),
  ],
  providers: [AuthService],
  exports: [AuthService], // Export for other modules to use
})
export class AuthModule {}
