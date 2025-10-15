import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop({ required: true })
  threshold: number; // Alert threshold (USDT)

  @Prop({ required: true, default: 30 })
  intervalMinutes: number; // Check interval (minutes) - default 30 minutes

  @Prop({ required: true, default: true })
  isActive: boolean; // Active status

  @Prop({ default: null })
  lastCheckedAt: Date; // Last check time

  @Prop({ default: null })
  lastAlertAt: Date; // Last alert time

  @Prop({ default: 0 })
  alertCount: number; // Number of alerts sent

  @Prop({ default: null })
  lastBalance: string; // Last checked balance
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
