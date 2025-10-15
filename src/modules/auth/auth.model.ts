// Import required libraries
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Import enum
import { UserRole } from './enums/user-role.enum';

/**
 * Mongoose Schema cho User
 */
@Schema({ 
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'users' // Collection name in MongoDB
})
export class UserModel {
  @Prop({ 
    required: true, 
    unique: true,
    index: true // Create index for fast search
  })
  telegramId: number;

  @Prop({ 
    type: String,
    sparse: true, // Allow null and unique
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
 * Create schema factory
 */
export const userSchema = SchemaFactory.createForClass(UserModel);

/**
 * Compound index to optimize queries
 */
userSchema.index({ telegramId: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastActiveAt: -1 });

/**
 * User Document type cho MongoDB
 */
export type UserDocument = UserModel & Document;
