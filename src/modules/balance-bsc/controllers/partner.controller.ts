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
   * Handle /partners command - Show partners list
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
   * Handle /add_partner command - Add new partner
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
            '❌ Missing required information! Use /add_partner <name> <display_name> <wallet_address>',
        };
      }

      // Check if partner already exists
      const existingPartner = await this.partnerService.getPartnerByName(name);
      if (existingPartner) {
        return {
          success: false,
          message: `❌ Partner with name "${escapeMarkdownV2(name)}" already exists!`,
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
          `✅ **Partner added successfully!**\n\n` +
          `**Name:** ${escapeMarkdownV2(newPartner.displayName)}\n` +
          `**ID:** \`${escapeMarkdownV2(newPartner.name)}\`\n` +
          `**Address:** \`${escapeMarkdownV2(newPartner.walletAddress)}\`\n` +
          `**Token:** ${escapeMarkdownV2(newPartner.tokenSymbol)}\n` +
          `**Chain ID:** ${escapeMarkdownV2(newPartner.chainId.toString())}`,
      };
    } catch (error) {
      this.logger.error('Error in handleAddPartnerCommand:', error);
      return {
        success: false,
        message: '❌ Error adding partner!',
      };
    }
  }

  /**
   * Handle /edit_partner command - Edit partner
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
          message: `❌ Partner with name "${escapeMarkdownV2(name)}" not found!`,
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
            `✅ **Partner updated successfully!**\n\n` +
            `**Name:** ${escapeMarkdownV2(updatedPartner.displayName)}\n` +
            `**ID:** \`${escapeMarkdownV2(updatedPartner.name)}\`\n` +
            `**Address:** \`${escapeMarkdownV2(updatedPartner.walletAddress)}\`\n` +
            `**Token:** ${escapeMarkdownV2(updatedPartner.tokenSymbol)}\n` +
            `**Chain ID:** ${escapeMarkdownV2(updatedPartner.chainId.toString())}`,
        };
      } else {
        return {
          success: false,
          message: '❌ Cannot update partner!',
        };
      }
    } catch (error) {
      this.logger.error('Error in handleEditPartnerCommand:', error);
      return {
        success: false,
        message: '❌ Error editing partner!',
      };
    }
  }

  /**
   * Handle /delete_partner command - Delete partner
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
          message: `❌ Partner with name "${escapeMarkdownV2(name)}" not found!`,
        };
      }

      // Delete partner (soft delete)
      const success = await this.partnerService.deletePartner(name);

      if (success) {
        return {
          success: true,
          message: `✅ **Partner "${escapeMarkdownV2(existingPartner.displayName)}" deleted successfully!**`,
        };
      } else {
        return {
          success: false,
          message: '❌ Cannot delete partner!',
        };
      }
    } catch (error) {
      this.logger.error('Error in handleDeletePartnerCommand:', error);
      return {
        success: false,
        message: '❌ Error deleting partner!',
      };
    }
  }

  /**
   * Create partners management keyboard
   */
  private createPartnerManagementKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '➕ Add Partner', callback_data: 'admin_add_partner' },
          { text: '✏️ Edit', callback_data: 'admin_edit_partner' },
        ],
        [
          { text: '🗑️ Delete Partner', callback_data: 'admin_delete_partner' },
          { text: '🔄 Refresh', callback_data: 'admin_refresh_partners' },
        ],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }],
      ],
    };
  }

  /**
   * Help message for add_partner command
   */
  private getAddPartnerHelpMessage(): string {
    return `**Add New Partner**

**Syntax:** \`/add_partner <name> <display_name> <wallet_address>\`

**Parameters:**
• \`name\`: Partner ID name (no spaces)
• \`display_name\`: Display name for user
• \`wallet_address\`: Wallet address on blockchain

**Example:**
\`/add_partner partner_a "Partner A" 0x1234567890abcdef1234567890abcdef12345678\`

**Note:** New partner will use default configuration (USDT, BSC Chain ID 56)`;
  }

  /**
   * Help message for edit_partner command
   */
  private getEditPartnerHelpMessage(): string {
    return `**Edit Partner**

**Syntax:** \`/edit_partner <name> <field> <value> [field value]...\`

**Editable fields:**
• \`display <new_name>\`: Display name
• \`address <new_address>\`: Wallet address
• \`contract <contract_address>\`: Contract address
• \`chain <chain_id>\`: Chain ID
• \`token <token_symbol>\`: Token symbol
• \`decimals <decimal_number>\`: Decimals
• \`description <description>\`: Description
• \`priority <priority>\`: Display priority

**Example:**
\`/edit_partner partner_a display "Partner A Updated" address 0xnewaddress123\``;
  }

  /**
   * Help message for delete_partner command
   */
  private getDeletePartnerHelpMessage(): string {
    return `**Delete Partner**

**Syntax:** \`/delete_partner <name>\`

**Parameters:**
• \`name\`: ID name of partner to delete

**Example:**
\`/delete_partner partner_a\`

**Note:** Partner will be hidden (soft delete) not completely removed from database`;
  }

  /**
   * Get partner by name (public method)
   */
  async getPartnerByName(name: string) {
    return this.partnerService.getPartnerByName(name);
  }

  /**
   * Create new partner
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
