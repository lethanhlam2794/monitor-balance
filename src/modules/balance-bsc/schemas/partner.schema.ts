import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ timestamps: true })
export class Partner {
  @Prop({ required: true, unique: true })
  name: string; // Partner name (e.g. "Vinachain", "Partner A")

  @Prop({ required: true })
  displayName: string; // Display name for user

  @Prop({ required: true })
  walletAddress: string; // Wallet address on blockchain

  @Prop({
    required: true,
    default: '0x55d398326f99059fF775485246999027B3197955',
  })
  contractAddress: string; // Token contract address (default USDT)

  @Prop({ required: true, default: 56 })
  chainId: number; // Chain ID (default BSC)

  @Prop({ required: true, default: 'USDT' })
  tokenSymbol: string; // Token symbol

  @Prop({ required: true, default: 18 })
  tokenDecimals: number; // Token decimals

  @Prop({ required: true, default: true })
  isActive: boolean; // Active status

  @Prop({ default: '' })
  description: string; // Description partner

  @Prop({ default: null })
  logoUrl: string; // Logo URL (optional)

  @Prop({ default: 0 })
  priority: number; // Display priority (smaller number = higher priority)
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
