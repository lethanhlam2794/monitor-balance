/**
 * Enum cho các Bot Messages
 * Quản lý tất cả message templates của Telegram Bot
 */

export enum BotMessages {
  // ===========================================
  // WELCOME & START MESSAGES
  // ===========================================
  WELCOME = 'WELCOME',

  // ===========================================
  // HELP MESSAGES
  // ===========================================
  HELP_HEADER = 'HELP_HEADER',
  HELP_FOOTER = 'HELP_FOOTER',

  // ===========================================
  // PROFILE MESSAGES
  // ===========================================
  PROFILE_HEADER = 'PROFILE_HEADER',
  PROFILE_TELEGRAM_ID = 'PROFILE_TELEGRAM_ID',
  PROFILE_NAME = 'PROFILE_NAME',
  PROFILE_USERNAME = 'PROFILE_USERNAME',
  PROFILE_LANGUAGE = 'PROFILE_LANGUAGE',
  PROFILE_ROLE = 'PROFILE_ROLE',
  PROFILE_JOINED = 'PROFILE_JOINED',
  PROFILE_LAST_ACTIVE = 'PROFILE_LAST_ACTIVE',
  PROFILE_STATUS = 'PROFILE_STATUS',
  PROFILE_NO_USERNAME = 'PROFILE_NO_USERNAME',
  PROFILE_UNKNOWN_LANGUAGE = 'PROFILE_UNKNOWN_LANGUAGE',
  PROFILE_ACTIVE = 'PROFILE_ACTIVE',
  PROFILE_INACTIVE = 'PROFILE_INACTIVE',

  // ===========================================
  // ADMIN MESSAGES
  // ===========================================
  ADMIN_PANEL = 'ADMIN_PANEL',

  // ===========================================
  // STATS MESSAGES
  // ===========================================
  STATS_HEADER = 'STATS_HEADER',
  STATS_TOTAL_USERS = 'STATS_TOTAL_USERS',
  STATS_ACTIVE_TODAY = 'STATS_ACTIVE_TODAY',
  STATS_ROLE_DISTRIBUTION = 'STATS_ROLE_DISTRIBUTION',
  STATS_DEV_COUNT = 'STATS_DEV_COUNT',
  STATS_ADMIN_COUNT = 'STATS_ADMIN_COUNT',
  STATS_ADVANCED_COUNT = 'STATS_ADVANCED_COUNT',
  STATS_USER_COUNT = 'STATS_USER_COUNT',

  // ===========================================
  // BUY CARD MESSAGES
  // ===========================================
  BUY_CARD_LOADING = 'BUY_CARD_LOADING',
  BUY_CARD_HEADER = 'BUY_CARD_HEADER',
  BUY_CARD_WALLET = 'BUY_CARD_WALLET',
  BUY_CARD_TOKEN = 'BUY_CARD_TOKEN',
  BUY_CARD_BALANCE = 'BUY_CARD_BALANCE',
  BUY_CARD_NETWORK = 'BUY_CARD_NETWORK',
  BUY_CARD_LAST_UPDATE = 'BUY_CARD_LAST_UPDATE',

  // ===========================================
  // ERROR MESSAGES
  // ===========================================
  ERROR_GENERAL = 'ERROR_GENERAL',
  ERROR_USER_NOT_FOUND = 'ERROR_USER_NOT_FOUND',
  ERROR_NO_PERMISSION = 'ERROR_NO_PERMISSION',
  ERROR_UNSUPPORTED_COMMAND = 'ERROR_UNSUPPORTED_COMMAND',
  ERROR_MISSING_ADDRESS_BUY_CARD = 'ERROR_MISSING_ADDRESS_BUY_CARD',
  ERROR_MISSING_CONTRACT_ADDRESS = 'ERROR_MISSING_CONTRACT_ADDRESS',
  ERROR_BALANCE_FETCH_FAILED = 'ERROR_BALANCE_FETCH_FAILED',
  ERROR_BALANCE_CHECK_FAILED = 'ERROR_BALANCE_CHECK_FAILED',

  // ===========================================
  // CALLBACK QUERY RESPONSES
  // ===========================================
  CALLBACK_FEATURE_DEVELOPING = 'CALLBACK_FEATURE_DEVELOPING',
}

/**
 * Mapping từ enum đến message content
 */
export const MESSAGE_CONTENT: Record<BotMessages, string> = {
  // ===========================================
  // WELCOME & START MESSAGES
  // ===========================================
  [BotMessages.WELCOME]: ` **Welcome to Telegram Bot!**

I am your support bot. Here are the available features:

 **Basic Commands:**
• /help - View detailed guide
• /profile - View profile information
• /start - Restart bot

Use /help to see more detailed information!`,

  // ===========================================
  // HELP MESSAGES
  // ===========================================
  [BotMessages.HELP_HEADER]: ` **Bot Usage Guide**\n\n`,
  [BotMessages.HELP_FOOTER]: ` **Note:** Some commands are only available with appropriate roles.`,

  // ===========================================
  // PROFILE MESSAGES
  // ===========================================
  [BotMessages.PROFILE_HEADER]: ` Profile Information\n\n`,
  [BotMessages.PROFILE_TELEGRAM_ID]: ` Telegram ID: `,
  [BotMessages.PROFILE_NAME]: ` Name: `,
  [BotMessages.PROFILE_USERNAME]: ` Username: `,
  [BotMessages.PROFILE_LANGUAGE]: ` Language: `,
  [BotMessages.PROFILE_ROLE]: ` Role: `,
  [BotMessages.PROFILE_JOINED]: ` Joined: `,
  [BotMessages.PROFILE_LAST_ACTIVE]: ` Last Active: `,
  [BotMessages.PROFILE_STATUS]: ` Status: `,
  [BotMessages.PROFILE_NO_USERNAME]: `None`,
  [BotMessages.PROFILE_UNKNOWN_LANGUAGE]: `Unknown`,
  [BotMessages.PROFILE_ACTIVE]: `Active`,
  [BotMessages.PROFILE_INACTIVE]: `Inactive`,

  // ===========================================
  // ADMIN MESSAGES
  // ===========================================
  [BotMessages.ADMIN_PANEL]: ` **Admin Panel**

 **User Management:**
• /users - List users
• /promote <user_id> <role> - Promote role
• /demote <user_id> - Demote role

 **Statistics:**
• /stats - System statistics

 **Settings:**
• /settings - Bot settings`,

  // ===========================================
  // STATS MESSAGES
  // ===========================================
  [BotMessages.STATS_HEADER]: ` **System Statistics**\n\n`,
  [BotMessages.STATS_TOTAL_USERS]: ` **Total Users:** `,
  [BotMessages.STATS_ACTIVE_TODAY]: ` **Active Today:** `,
  [BotMessages.STATS_ROLE_DISTRIBUTION]: ` **Role Distribution:**`,
  [BotMessages.STATS_DEV_COUNT]: `•  Developer: `,
  [BotMessages.STATS_ADMIN_COUNT]: `•  Admin: `,
  [BotMessages.STATS_ADVANCED_COUNT]: `•  Advanced User: `,
  [BotMessages.STATS_USER_COUNT]: `•  Regular User: `,

  // ===========================================
  // BUY CARD MESSAGES
  // ===========================================
  [BotMessages.BUY_CARD_LOADING]: `Checking balance...`,
  [BotMessages.BUY_CARD_HEADER]: `Buy Card Fund Information\n\n`,
  [BotMessages.BUY_CARD_WALLET]: `Wallet Address: `,
  [BotMessages.BUY_CARD_TOKEN]: `Token: `,
  [BotMessages.BUY_CARD_BALANCE]: `Balance: `,
  [BotMessages.BUY_CARD_NETWORK]: `Network: BSC (Chain ID: `,
  [BotMessages.BUY_CARD_LAST_UPDATE]: `Last Updated: `,

  // ===========================================
  // ERROR MESSAGES
  // ===========================================
  [BotMessages.ERROR_GENERAL]: `An error occurred, please try again later.`,
  [BotMessages.ERROR_USER_NOT_FOUND]: `User information not found.`,
  [BotMessages.ERROR_NO_PERMISSION]: `You don't have permission to access this feature.`,
  [BotMessages.ERROR_UNSUPPORTED_COMMAND]: `Command not supported. Use /help to see available commands.`,
  [BotMessages.ERROR_MISSING_ADDRESS_BUY_CARD]: `Configuration error: Missing ADDRESS_BUY_CARD in environment variables.`,
  [BotMessages.ERROR_MISSING_CONTRACT_ADDRESS]: `Configuration error: Missing CONTRACT_ADDRESS_USDT in environment variables.`,
  [BotMessages.ERROR_BALANCE_FETCH_FAILED]: `Unable to fetch balance information. Please try again later.`,
  [BotMessages.ERROR_BALANCE_CHECK_FAILED]: `An error occurred while checking balance. Please try again later.`,

  // ===========================================
  // CALLBACK QUERY RESPONSES
  // ===========================================
  [BotMessages.CALLBACK_FEATURE_DEVELOPING]: `Feature is under development`,
};

/**
 * Helper function để lấy message content
 */
export const getMessage = (messageKey: BotMessages): string => {
  return MESSAGE_CONTENT[messageKey];
};

/**
 * Helper function cho regular message response
 */
export const getRegularMessageResponse = (text: string): string => {
  return ` Bạn đã gửi: "${text}"\n\nSử dụng /help để xem danh sách commands có sẵn.`;
};
