import { Injectable, Logger } from '@nestjs/common';
import {
  PartnerService,
  CreatePartnerDto,
  UpdatePartnerDto,
} from '../services/partner.service';
import { MessageBuilder } from '@shared/message_builder';
import { escapeMarkdownV2 } from '@shared/message_builder';

export interface PartnerResponse {
  success: boolean;
  message: string;
  keyboard?: any;
}

@Injectable()
export class PartnerControllerService {
  private readonly logger = new Logger(PartnerControllerService.name);

  constructor(private partnerService: PartnerService) {}

  /**
   * Xử lý lệnh /partners - Hiển thị danh sách partners
   */
  async handlePartnersCommand(): Promise<PartnerResponse> {
    try {
      const partners = await this.partnerService.getActivePartners();

      if (partners.length === 0) {
        return {
          success: true,
          message: '📋 **Partners List**\n\n❌ No partners configured yet.',
        };
      }

      let message = '📋 **Partners List**\n\n';

      partners.forEach((partner, index) => {
        const addressShort = `${partner.walletAddress.slice(0, 6)}\\.\\.\\.${partner.walletAddress.slice(-4)}`;
        message += `**${index + 1}\\. ${escapeMarkdownV2(partner.displayName)}**\n`;
        message += `• Name: \`${escapeMarkdownV2(partner.name)}\`\n`;
        message += `• Address: \`${escapeMarkdownV2(addressShort)}\`\n`;
        message += `• Token: ${escapeMarkdownV2(partner.tokenSymbol)}\n`;
        message += `• Chain: ${escapeMarkdownV2(partner.chainId.toString())}\n`;
        if (partner.description) {
          message += `• Description: ${escapeMarkdownV2(partner.description)}\n`;
        }
        message += '\n';
      });

      const keyboard = this.createPartnerManagementKeyboard();

      return {
        success: true,
        message: message,
        keyboard: keyboard,
      };
    } catch (error) {
      this.logger.error('Error in handlePartnersCommand:', error);
      return {
        success: false,
        message: '❌ Error fetching partners list!',
      };
    }
  }

  /**
   * Xử lý lệnh /add_partner - Thêm partner mới
   */
  async handleAddPartnerCommand(
    commandText?: string,
  ): Promise<PartnerResponse> {
    try {
      const args = commandText?.split(' ').slice(1) || [];

      if (args.length < 3) {
        const helpMessage = this.getAddPartnerHelpMessage();
        return {
          success: true,
          message: helpMessage,
        };
      }

      const [name, displayName, walletAddress] = args;

      // Validate input
      if (!name || !displayName || !walletAddress) {
        return {
          success: false,
          message:
            '❌ Thiếu thông tin bắt buộc! Sử dụng /add_partner <name> <display_name> <wallet_address>',
        };
      }

      // Check if partner already exists
      const existingPartner = await this.partnerService.getPartnerByName(name);
      if (existingPartner) {
        return {
          success: false,
          message: `❌ Partner với tên "${escapeMarkdownV2(name)}" đã tồn tại!`,
        };
      }

      // Create partner
      const createPartnerDto: CreatePartnerDto = {
        name,
        displayName,
        walletAddress,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955', // Default USDT
        chainId: 56, // Default BSC
        tokenSymbol: 'USDT',
        tokenDecimals: 18,
        priority: 999, // Default priority
      };

      const newPartner =
        await this.partnerService.createPartner(createPartnerDto);

      return {
        success: true,
        message:
          `✅ **Partner đã được thêm thành công!**\n\n` +
          `**Tên:** ${escapeMarkdownV2(newPartner.displayName)}\n` +
          `**ID:** \`${escapeMarkdownV2(newPartner.name)}\`\n` +
          `**Địa chỉ:** \`${escapeMarkdownV2(newPartner.walletAddress)}\`\n` +
          `**Token:** ${escapeMarkdownV2(newPartner.tokenSymbol)}\n` +
          `**Chain ID:** ${escapeMarkdownV2(newPartner.chainId.toString())}`,
      };
    } catch (error) {
      this.logger.error('Error in handleAddPartnerCommand:', error);
      return {
        success: false,
        message: '❌ Lỗi khi thêm partner!',
      };
    }
  }

  /**
   * Xử lý lệnh /edit_partner - Chỉnh sửa partner
   */
  async handleEditPartnerCommand(
    commandText?: string,
  ): Promise<PartnerResponse> {
    try {
      const args = commandText?.split(' ').slice(1) || [];

      if (args.length < 2) {
        const helpMessage = this.getEditPartnerHelpMessage();
        return {
          success: true,
          message: helpMessage,
        };
      }

      const [name, ...updateArgs] = args;

      // Get existing partner
      const existingPartner = await this.partnerService.getPartnerByName(name);
      if (!existingPartner) {
        return {
          success: false,
          message: `❌ Không tìm thấy partner với tên "${escapeMarkdownV2(name)}"!`,
        };
      }

      // Parse update arguments
      const updateData: UpdatePartnerDto = {};

      for (let i = 0; i < updateArgs.length; i += 2) {
        const field = updateArgs[i];
        const value = updateArgs[i + 1];

        switch (field) {
          case 'display':
            updateData.displayName = value;
            break;
          case 'address':
            updateData.walletAddress = value;
            break;
          case 'contract':
            updateData.contractAddress = value;
            break;
          case 'chain':
            updateData.chainId = parseInt(value);
            break;
          case 'token':
            updateData.tokenSymbol = value;
            break;
          case 'decimals':
            updateData.tokenDecimals = parseInt(value);
            break;
          case 'description':
            updateData.description = value;
            break;
          case 'priority':
            updateData.priority = parseInt(value);
            break;
        }
      }

      const updatedPartner = await this.partnerService.updatePartner(
        name,
        updateData,
      );

      if (updatedPartner) {
        return {
          success: true,
          message:
            `✅ **Partner đã được cập nhật thành công!**\n\n` +
            `**Tên:** ${escapeMarkdownV2(updatedPartner.displayName)}\n` +
            `**ID:** \`${escapeMarkdownV2(updatedPartner.name)}\`\n` +
            `**Địa chỉ:** \`${escapeMarkdownV2(updatedPartner.walletAddress)}\`\n` +
            `**Token:** ${escapeMarkdownV2(updatedPartner.tokenSymbol)}\n` +
            `**Chain ID:** ${escapeMarkdownV2(updatedPartner.chainId.toString())}`,
        };
      } else {
        return {
          success: false,
          message: '❌ Không thể cập nhật partner!',
        };
      }
    } catch (error) {
      this.logger.error('Error in handleEditPartnerCommand:', error);
      return {
        success: false,
        message: '❌ Lỗi khi chỉnh sửa partner!',
      };
    }
  }

  /**
   * Xử lý lệnh /delete_partner - Xóa partner
   */
  async handleDeletePartnerCommand(
    commandText?: string,
  ): Promise<PartnerResponse> {
    try {
      const args = commandText?.split(' ').slice(1) || [];

      if (args.length === 0) {
        const helpMessage = this.getDeletePartnerHelpMessage();
        return {
          success: true,
          message: helpMessage,
        };
      }

      const name = args[0];

      // Check if partner exists
      const existingPartner = await this.partnerService.getPartnerByName(name);
      if (!existingPartner) {
        return {
          success: false,
          message: `❌ Không tìm thấy partner với tên "${escapeMarkdownV2(name)}"!`,
        };
      }

      // Delete partner (soft delete)
      const success = await this.partnerService.deletePartner(name);

      if (success) {
        return {
          success: true,
          message: `✅ **Partner "${escapeMarkdownV2(existingPartner.displayName)}" đã được xóa thành công!**`,
        };
      } else {
        return {
          success: false,
          message: '❌ Không thể xóa partner!',
        };
      }
    } catch (error) {
      this.logger.error('Error in handleDeletePartnerCommand:', error);
      return {
        success: false,
        message: '❌ Lỗi khi xóa partner!',
      };
    }
  }

  /**
   * Tạo keyboard quản lý partners
   */
  private createPartnerManagementKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '➕ Thêm Partner', callback_data: 'admin_add_partner' },
          { text: '✏️ Chỉnh sửa', callback_data: 'admin_edit_partner' },
        ],
        [
          { text: '🗑️ Xóa Partner', callback_data: 'admin_delete_partner' },
          { text: '🔄 Làm mới', callback_data: 'admin_refresh_partners' },
        ],
        [{ text: '🔙 Về Admin Panel', callback_data: 'admin_panel' }],
      ],
    };
  }

  /**
   * Help message cho lệnh add_partner
   */
  private getAddPartnerHelpMessage(): string {
    return `**Thêm Partner Mới**

**Cú pháp:** \`/add_partner <name> <display_name> <wallet_address>\`

**Tham số:**
• \`name\`: Tên ID của partner (không có khoảng trắng)
• \`display_name\`: Tên hiển thị cho user
• \`wallet_address\`: Địa chỉ ví trên blockchain

**Ví dụ:**
\`/add_partner partner_a "Partner A" 0x1234567890abcdef1234567890abcdef12345678\`

**Lưu ý:** Partner mới sẽ sử dụng cấu hình mặc định (USDT, BSC Chain ID 56)`;
  }

  /**
   * Help message cho lệnh edit_partner
   */
  private getEditPartnerHelpMessage(): string {
    return `**Chỉnh sửa Partner**

**Cú pháp:** \`/edit_partner <name> <field> <value> [field value]...\`

**Các trường có thể chỉnh sửa:**
• \`display <tên_mới>\`: Tên hiển thị
• \`address <địa_chỉ_mới>\`: Địa chỉ ví
• \`contract <contract_address>\`: Contract address
• \`chain <chain_id>\`: Chain ID
• \`token <token_symbol>\`: Ký hiệu token
• \`decimals <số_thập_phân>\`: Số thập phân
• \`description <mô_tả>\`: Mô tả
• \`priority <độ_ưu_tiên>\`: Độ ưu tiên hiển thị

**Ví dụ:**
\`/edit_partner partner_a display "Partner A Updated" address 0xnewaddress123\``;
  }

  /**
   * Help message cho lệnh delete_partner
   */
  private getDeletePartnerHelpMessage(): string {
    return `**Xóa Partner**

**Cú pháp:** \`/delete_partner <name>\`

**Tham số:**
• \`name\`: Tên ID của partner cần xóa

**Ví dụ:**
\`/delete_partner partner_a\`

**Lưu ý:** Partner sẽ được ẩn (soft delete) chứ không xóa hoàn toàn khỏi database`;
  }

  /**
   * Lấy partner theo name (public method)
   */
  async getPartnerByName(name: string) {
    return this.partnerService.getPartnerByName(name);
  }

  /**
   * Tạo partner mới
   */
  async createPartner(partnerData: {
    name: string;
    displayName: string;
    walletAddress: string;
  }): Promise<PartnerResponse> {
    try {
      const result = await this.partnerService.createPartner({
        name: partnerData.name,
        displayName: partnerData.displayName,
        walletAddress: partnerData.walletAddress,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955', // USDT default
        chainId: 56, // BSC default
        tokenSymbol: 'USDT',
        tokenDecimals: 18,
        description: `Partner ${partnerData.displayName}`,
        priority: 999, // Default priority
      });

      return {
        success: true,
        message: `✅ Partner "${escapeMarkdownV2(partnerData.displayName)}" created successfully\\!`,
      };
    } catch (error) {
      this.logger.error('Error in createPartner:', error);
      return {
        success: false,
        message: '❌ Error occurred while creating partner\\!',
      };
    }
  }
}
