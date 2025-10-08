import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop({ required: true })
  threshold: number; // Ngưỡng cảnh báo (USDT)

  @Prop({ required: true, default: 30 })
  intervalMinutes: number; // Khoảng thời gian kiểm tra (phút) - mặc định 30 phút

  @Prop({ required: true, default: true })
  isActive: boolean; // Trạng thái hoạt động

  @Prop({ default: null })
  lastCheckedAt: Date; // Lần kiểm tra cuối

  @Prop({ default: null })
  lastAlertAt: Date; // Lần cảnh báo cuối

  @Prop({ default: 0 })
  alertCount: number; // Số lần đã cảnh báo

  @Prop({ default: null })
  lastBalance: string; // Balance cuối cùng đã kiểm tra
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
