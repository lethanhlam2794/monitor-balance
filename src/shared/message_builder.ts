/**
 * Message Builder - Helper functions to create dynamic messages
 * Separated from static messages for better organization
 */

import {
  getMessage,
  BotMessages,
  getRegularMessageResponse,
} from './enums/bot-messages.enum';
import {
  COMMANDS_BY_ROLE,
  getCommandDescription,
} from './enums/bot-commands.enum';
import TelegramBot from 'node-telegram-bot-api';

/**
 * Escape special characters for MarkdownV2 (except backticks)
 */
export const escapeMarkdownV2 = (text: string): string => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

/**
 * Format number with commas for better readability
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * Helper functions to create dynamic messages
 */
export const MessageBuilder = {
  /**
   * Create help message based on role
   */
  buildHelpMessage: (
    roleDescription: string,
    hasAdvanced: boolean,
    hasAdmin: boolean,
    hasDev: boolean,
  ): string => {
    let message = getMessage(BotMessages.HELP_HEADER);
    message += ` **Your Role:** ${roleDescription}\n\n`;

    // Basic commands
    message += ` **Basic Commands:**\n`;
    COMMANDS_BY_ROLE.BASIC.forEach((command) => {
      message += `• ${command} - ${getCommandDescription(command)}\n`;
    });
    message += '\n';

    // Advanced commands
    if (hasAdvanced) {
      message += ` **Advanced Commands:**\n`;
      COMMANDS_BY_ROLE.ADVANCED.forEach((command) => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    // Admin commands
    if (hasAdmin) {
      message += ` **Commands Admin:**\n`;
      COMMANDS_BY_ROLE.ADMIN.forEach((command) => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    // Developer commands
    if (hasDev) {
      message += ` **Commands Developer:**\n`;
      COMMANDS_BY_ROLE.DEV.forEach((command) => {
        message += `• ${command} - ${getCommandDescription(command)}\n`;
      });
      message += '\n';
    }

    message += getMessage(BotMessages.HELP_FOOTER);
    return message;
  },

  /**
   * Create profile message
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
    isActive: boolean,
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
   * Create stats message
   */
  buildStatsMessage: (
    total: number,
    activeToday: number,
    devCount: number,
    adminCount: number,
    advancedCount: number,
    userCount: number,
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
   * Create buy card message
   */
  buildBuyCardMessage: (
    walletAddress: string,
    symbol: string,
    balanceFormatted: string,
    chainId: number,
    partnerName?: string,
  ): string => {
    const header = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_HEADER));
    const wallet = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_WALLET));
    const token = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_TOKEN));
    const balance = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_BALANCE));
    const network = escapeMarkdownV2(getMessage(BotMessages.BUY_CARD_NETWORK));
    const lastUpdate = escapeMarkdownV2(
      getMessage(BotMessages.BUY_CARD_LAST_UPDATE),
    );

    const customHeader = partnerName
      ? `Buy Card Fund Information ${escapeMarkdownV2(partnerName)}\n\n`
      : header;

    return `${customHeader}${wallet}
🔴 \`${escapeMarkdownV2(walletAddress)}\`

${token}${escapeMarkdownV2(symbol)}
${balance}${escapeMarkdownV2(balanceFormatted)} ${escapeMarkdownV2(symbol)}
${network}${chainId}\\)

${lastUpdate}${escapeMarkdownV2(new Date().toLocaleString('vi-VN'))}`;
  },

  /**
   * Create inline keyboard for copy wallet address (common for all)
   */
  buildCopyWalletKeyboard: (
    walletAddress: string,
  ): TelegramBot.InlineKeyboardMarkup => {
    return {
      inline_keyboard: [
        [
          {
            text: '📋 Copy wallet address',
            copy_text: { text: walletAddress },
          } as any,
        ],
      ],
    };
  },

  /**
   * Create inline keyboard for copy multiple wallet addresses
   */
  buildCopyMultipleWalletsKeyboard: (
    wallets: Array<{ network: string; address: string }>,
  ): TelegramBot.InlineKeyboardMarkup => {
    const buttons = wallets.map(
      (wallet, index) =>
        ({
          text: '📋 Copy wallet address',
          copy_text: { text: wallet.address },
        }) as any,
    );

    // Split buttons into rows, maximum 2 buttons per row
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    return {
      inline_keyboard: rows,
    };
  },

  /**
   * Create inline keyboard for copy partner wallet (reuse buildCopyWalletKeyboard)
   */
  buildCopyPartnerWalletKeyboard: (
    walletAddress: string,
  ): TelegramBot.InlineKeyboardMarkup => {
    return MessageBuilder.buildCopyWalletKeyboard(walletAddress);
  },
};
