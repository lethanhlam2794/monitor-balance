import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ timestamps: true })
export class Partner {
  @Prop({ required: true, unique: true })
  name: string; // Tên partner (ví dụ: "Vinachain", "Partner A")

  @Prop({ required: true })
  displayName: string; // Tên hiển thị cho user

  @Prop({ required: true })
  walletAddress: string; // Địa chỉ ví trên blockchain

  @Prop({
    required: true,
    default: '0x55d398326f99059fF775485246999027B3197955',
  })
  contractAddress: string; // Contract address của token (mặc định USDT)

  @Prop({ required: true, default: 56 })
  chainId: number; // Chain ID (mặc định BSC)

  @Prop({ required: true, default: 'USDT' })
  tokenSymbol: string; // Ký hiệu token

  @Prop({ required: true, default: 18 })
  tokenDecimals: number; // Số thập phân của token

  @Prop({ required: true, default: true })
  isActive: boolean; // Trạng thái hoạt động

  @Prop({ default: '' })
  description: string; // Mô tả partner

  @Prop({ default: null })
  logoUrl: string; // URL logo (tùy chọn)

  @Prop({ default: 0 })
  priority: number; // Độ ưu tiên hiển thị (số càng nhỏ càng ưu tiên)
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
