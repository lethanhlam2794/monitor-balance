// Import các thư viện cần thiết
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Import enum
import { UserRole } from './enums/user-role.enum';

/**
 * Mongoose Schema cho User
 */
@Schema({ 
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'users' // Tên collection trong MongoDB
})
export class UserModel {
  @Prop({ 
    required: true, 
    unique: true,
    index: true // Tạo index để tìm kiếm nhanh
  })
  telegramId: number;

  @Prop({ 
    type: String,
    sparse: true, // Cho phép null và unique
    index: true
  })
  username?: string;

  @Prop({ type: String })
  firstName?: string;

  @Prop({ type: String })
  lastName?: string;

  @Prop({ type: String })
  languageCode?: string;

  @Prop({ 
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    index: true
  })
  role: UserRole;

  @Prop({ 
    type: Boolean,
    default: true,
    index: true
  })
  isActive: boolean;

  @Prop({ 
    type: Date,
    default: Date.now,
    index: true
  })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({ 
    type: Date,
    default: Date.now,
    index: true
  })
  lastActiveAt: Date;
}

/**
 * Tạo schema factory
 */
export const userSchema = SchemaFactory.createForClass(UserModel);

/**
 * Index compound để tối ưu queries
 */
userSchema.index({ telegramId: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastActiveAt: -1 });

/**
 * User Document type cho MongoDB
 */
export type UserDocument = UserModel & Document;
