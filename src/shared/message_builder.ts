/**
 * Message Builder - Helper functions để tạo message động
 * Tách riêng khỏi static messages để tổ chức tốt hơn
 */

import { getMessage, BotMessages, getRegularMessageResponse } from './enums/bot-messages.enum';
import { COMMANDS_BY_ROLE, getCommandDescription } from './enums/bot-commands.enum';
import TelegramBot from 'node-telegram-bot-api';

/**
 * Escape ký tự đặc biệt cho MarkdownV2 (trừ backticks)
 */
export const escapeMarkdownV2 = (text: string): string => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};


/**
 * Helper functions để tạo message động
 */
export const MessageBuilder = {
  /**
   * Tạo help message dựa trên role
   */
  buildHelpMessage: (roleDescription: string, hasAdvanced: boolean, hasAdmin: boolean, hasDev: boolean): string => {
    let message = getMessage(BotMessages.HELP_HEADER);
    message += ` **Role của bạn:** ${roleDescription}\n\n`;

    // Commands cơ bản
    message += ` **Commands cơ bản:**\n`;
    COMMANDS_BY_ROLE.BASIC.forEach(command => {
      message += `• ${command} - ${getCommandDescription(command)}\n`;
    });
    message += '\n';

    // Commands nâng cao
    if (hasAdvanced) {
      message += ` **Commands nâng cao:**\n`;
      COMMANDS_BY_ROLE.ADVANCED.forEach(command => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    // Commands Admin
    if (hasAdmin) {
      message += ` **Commands Admin:**\n`;
      COMMANDS_BY_ROLE.ADMIN.forEach(command => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    // Commands Dev
    if (hasDev) {
      message += ` **Commands Developer:**\n`;
      COMMANDS_BY_ROLE.DEV.forEach(command => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    message += getMessage(BotMessages.HELP_FOOTER);
    return message;
  },

  /**
   * Tạo profile message
   */
  buildProfileMessage: (
    telegramId: number,
    firstName: string,
    lastName: string,
    username: string,
    languageCode: string,
    roleDescription: string,
    createdAt: Date,
    lastActiveAt: Date,
    isActive: boolean
  ): string => {
    return `${getMessage(BotMessages.PROFILE_HEADER)}${getMessage(BotMessages.PROFILE_TELEGRAM_ID)}${telegramId}
${getMessage(BotMessages.PROFILE_NAME)}${firstName} ${lastName || ''}
${getMessage(BotMessages.PROFILE_USERNAME)}${username ? '@' + username : getMessage(BotMessages.PROFILE_NO_USERNAME)}
${getMessage(BotMessages.PROFILE_LANGUAGE)}${languageCode || getMessage(BotMessages.PROFILE_UNKNOWN_LANGUAGE)}
${getMessage(BotMessages.PROFILE_ROLE)}${roleDescription}
${getMessage(BotMessages.PROFILE_JOINED)}${createdAt.toLocaleDateString('vi-VN')}
${getMessage(BotMessages.PROFILE_LAST_ACTIVE)}${lastActiveAt.toLocaleString('vi-VN')}
${getMessage(BotMessages.PROFILE_STATUS)}${isActive ? getMessage(BotMessages.PROFILE_ACTIVE) : getMessage(BotMessages.PROFILE_INACTIVE)}`;
  },

  /**
   * Tạo stats message
   */
  buildStatsMessage: (
    total: number,
    activeToday: number,
    devCount: number,
    adminCount: number,
    advancedCount: number,
    userCount: number
  ): string => {
    return `${getMessage(BotMessages.STATS_HEADER)}${getMessage(BotMessages.STATS_TOTAL_USERS)}${total}
${getMessage(BotMessages.STATS_ACTIVE_TODAY)}${activeToday}

${getMessage(BotMessages.STATS_ROLE_DISTRIBUTION)}
${getMessage(BotMessages.STATS_DEV_COUNT)}${devCount}
${getMessage(BotMessages.STATS_ADMIN_COUNT)}${adminCount}
${getMessage(BotMessages.STATS_ADVANCED_COUNT)}${advancedCount}
${getMessage(BotMessages.STATS_USER_COUNT)}${userCount}`;
  },

  /**
   * Tạo buy card message
   */
  buildBuyCardMessage: (
    walletAddress: string,
    symbol: string,
    balanceFormatted: string,
    chainId: number
  ): string => {
    const header = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_HEADER));
    const wallet = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_WALLET));
    const token = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_TOKEN));
    const balance = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_BALANCE));
    const network = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_NETWORK));
    const lastUpdate = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_LAST_UPDATE));
    
    return `${header}${wallet}
🔴 \`${escapeMarkdownV2(walletAddress)}\`

${token}${escapeMarkdownV2(symbol)}
${balance}${escapeMarkdownV2(balanceFormatted)} ${escapeMarkdownV2(symbol)}
${network}${chainId}\\)

${lastUpdate}${escapeMarkdownV2(new Date().toLocaleString('vi-VN'))}`;
  },

  /**
   * Tạo inline keyboard cho copy wallet address
   */
  buildCopyWalletKeyboard: (walletAddress: string): TelegramBot.InlineKeyboardMarkup => {
    return {
      inline_keyboard: [
        [
          {
            text: '📋 Copy Wallet Address',
            copy_text: { text: walletAddress }
          } as any
        ]
      ]
    };
  },

  /**
   * Tạo inline keyboard cho copy multiple wallet addresses
   */
  buildCopyMultipleWalletsKeyboard: (wallets: Array<{ network: string; address: string }>): TelegramBot.InlineKeyboardMarkup => {
    const buttons = wallets.map((wallet, index) => ({
      text: `📋 Copy ${wallet.network}`,
      copy_text: { text: wallet.address }
    } as any));

    // Chia buttons thành các hàng, mỗi hàng tối đa 2 buttons
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    return {
      inline_keyboard: rows
    };
  },

  /**
   * Tạo inline keyboard cho copy partner wallet
   */
  buildCopyPartnerWalletKeyboard: (): TelegramBot.InlineKeyboardMarkup => {
    const partnerWallet = '0x1ef3355161464d2465e3591d536ea74ab88de1ef';
    return {
      inline_keyboard: [
        [
          {
            text: '📋 Copy Partner Wallet',
            copy_text: { text: partnerWallet }
          } as any
        ]
      ]
    };
  },

 
};
