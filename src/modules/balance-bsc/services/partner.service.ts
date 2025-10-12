import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Partner, PartnerDocument } from '../schemas/partner.schema';

export interface CreatePartnerDto {
  name: string;
  displayName: string;
  walletAddress: string;
  contractAddress?: string;
  chainId?: number;
  tokenSymbol?: string;
  tokenDecimals?: number;
  description?: string;
  logoUrl?: string;
  priority?: number;
}

export interface UpdatePartnerDto {
  displayName?: string;
  walletAddress?: string;
  contractAddress?: string;
  chainId?: number;
  tokenSymbol?: string;
  tokenDecimals?: number;
  description?: string;
  logoUrl?: string;
  priority?: number;
  isActive?: boolean;
}

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {}

  /**
   * Tạo partner mới
   */
  async createPartner(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    try {
      const partner = new this.partnerModel(createPartnerDto);
      const savedPartner = await partner.save();

      this.logger.log(
        `Partner created: ${savedPartner.name} (${savedPartner.displayName})`,
      );
      return savedPartner;
    } catch (error) {
      this.logger.error('Error creating partner:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả partners active
   */
  async getActivePartners(): Promise<Partner[]> {
    try {
      return await this.partnerModel
        .find({ isActive: true })
        .sort({ priority: 1, name: 1 })
        .exec();
    } catch (error) {
      this.logger.error('Error getting active partners:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả partners (bao gồm inactive)
   */
  async getAllPartners(): Promise<Partner[]> {
    try {
      return await this.partnerModel
        .find()
        .sort({ priority: 1, name: 1 })
        .exec();
    } catch (error) {
      this.logger.error('Error getting all partners:', error);
      throw error;
    }
  }

  /**
   * Lấy partner theo name
   */
  async getPartnerByName(name: string): Promise<Partner | null> {
    try {
      return await this.partnerModel.findOne({ name }).exec();
    } catch (error) {
      this.logger.error(`Error getting partner by name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Lấy partner theo ID
   */
  async getPartnerById(id: string): Promise<Partner | null> {
    try {
      return await this.partnerModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error getting partner by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cập nhật partner
   */
  async updatePartner(
    name: string,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<Partner | null> {
    try {
      const updatedPartner = await this.partnerModel
        .findOneAndUpdate({ name }, { $set: updatePartnerDto }, { new: true })
        .exec();

      if (updatedPartner) {
        this.logger.log(`Partner updated: ${updatedPartner.name}`);
      }

      return updatedPartner;
    } catch (error) {
      this.logger.error(`Error updating partner ${name}:`, error);
      throw error;
    }
  }

  /**
   * Xóa partner (soft delete - set isActive = false)
   */
  async deletePartner(name: string): Promise<boolean> {
    try {
      const result = await this.partnerModel
        .findOneAndUpdate(
          { name },
          { $set: { isActive: false } },
          { new: true },
        )
        .exec();

      if (result) {
        this.logger.log(`Partner deactivated: ${result.name}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error deleting partner ${name}:`, error);
      throw error;
    }
  }

  /**
   * Khôi phục partner (set isActive = true)
   */
  async restorePartner(name: string): Promise<boolean> {
    try {
      const result = await this.partnerModel
        .findOneAndUpdate({ name }, { $set: { isActive: true } }, { new: true })
        .exec();

      if (result) {
        this.logger.log(`Partner restored: ${result.name}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error restoring partner ${name}:`, error);
      throw error;
    }
  }

  /**
   * Kiểm tra partner có tồn tại không
   */
  async partnerExists(name: string): Promise<boolean> {
    try {
      const partner = await this.partnerModel.findOne({ name }).exec();
      return !!partner;
    } catch (error) {
      this.logger.error(`Error checking partner existence ${name}:`, error);
      throw error;
    }
  }

  /**
   * Khởi tạo partner mặc định (Vinachain)
   */
  async initializeDefaultPartner(): Promise<void> {
    try {
      const existingPartner = await this.partnerModel
        .findOne({ name: 'vinachain' })
        .exec();

      if (!existingPartner) {
        const defaultPartner: CreatePartnerDto = {
          name: 'vinachain',
          displayName: 'Vinachain',
          walletAddress: process.env.ADDRESS_BUY_CARD || '',
          contractAddress:
            process.env.CONTRACT_ADDRESS_USDT ||
            '0x55d398326f99059fF775485246999027B3197955',
          chainId: 56,
          tokenSymbol: 'USDT',
          tokenDecimals: 18,
          description: 'Default Vinachain partner',
          priority: 1,
        };

        await this.createPartner(defaultPartner);
        this.logger.log('Default Vinachain partner initialized');
      }
    } catch (error) {
      this.logger.error('Error initializing default partner:', error);
      throw error;
    }
  }
}
