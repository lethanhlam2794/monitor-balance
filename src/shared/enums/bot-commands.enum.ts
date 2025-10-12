/**
 * Enum for Bot Commands
 * Manage all Telegram Bot commands
 */

export enum BotCommands {
  // ===========================================
  // BASIC COMMANDS (All users)
  // ===========================================
  START = '/start',
  HELP = '/help',
  PROFILE = '/profile',
  VIEW_BUYCARD = '/view_buycard',
  MONITOR_BUY_CARD = '/monitor_buy_card',
  OFF_MONITOR_BUY_CARD = '/off_monitor_buy_card',
  MASTERFUND_VINACHAIN = '/masterfund_vinachain',
  MONITOR_MASTER_FUND = '/monitor_master_fund',
  OFF_MONITOR_MASTER_FUND = '/off_monitor_master_fund',

  // ===========================================
  // ADVANCED COMMANDS (Advanced User and above)
  // ===========================================
  ADVANCED = '/advanced',

  // ===========================================
  // ADMIN COMMANDS (Admin and above)
  // ===========================================
  ADMIN = '/admin',
  STATS = '/stats',
  USERS = '/users',
  PARTNERS = '/partners',
  ADD_PARTNER = '/add_partner',
  EDIT_PARTNER = '/edit_partner',
  DELETE_PARTNER = '/delete_partner',
  CLEAR_CACHE = '/clear_cache',
  API_STATUS = '/api_status',

  // ===========================================
  // DEV COMMANDS (Dev only)
  // ===========================================
  DEV = '/dev',
  LOGS = '/logs',
  DEBUG = '/debug',
  SPAM = '/spam',
}

/**
 * Command descriptions
 */
export const COMMAND_DESCRIPTIONS: Record<BotCommands, string> = {
  [BotCommands.START]: 'Start the bot',
  [BotCommands.HELP]: 'Show this help guide',
  [BotCommands.PROFILE]: 'View profile information',
  [BotCommands.VIEW_BUYCARD]: 'View Buy Card Fund balance',
  [BotCommands.MONITOR_BUY_CARD]: 'Set Buy Card balance monitoring reminder',
  [BotCommands.OFF_MONITOR_BUY_CARD]:
    'Disable Buy Card balance monitoring reminder',
  [BotCommands.MASTERFUND_VINACHAIN]: 'View Master Fund Vinachain information',
  [BotCommands.MONITOR_MASTER_FUND]: 'Set Master Fund monitoring reminder',
  [BotCommands.OFF_MONITOR_MASTER_FUND]:
    'Disable Master Fund monitoring reminder',
  [BotCommands.ADVANCED]: 'Advanced features',
  [BotCommands.ADMIN]: 'Admin panel',
  [BotCommands.STATS]: 'View system statistics',
  [BotCommands.USERS]: 'Manage users',
  [BotCommands.PARTNERS]: 'Manage partners',
  [BotCommands.ADD_PARTNER]: 'Add new partner',
  [BotCommands.EDIT_PARTNER]: 'Edit partner',
  [BotCommands.DELETE_PARTNER]: 'Delete partner',
  [BotCommands.CLEAR_CACHE]: 'Clear balance cache',
  [BotCommands.API_STATUS]: 'View API key status',
  [BotCommands.DEV]: 'Developer tools',
  [BotCommands.LOGS]: 'View system logs',
  [BotCommands.DEBUG]: 'Debug information',
  [BotCommands.SPAM]: 'Spam call Buy Card API (Dev only)',
};

/**
 * Commands grouped by role
 */
export const COMMANDS_BY_ROLE = {
  BASIC: [
    BotCommands.START,
    BotCommands.HELP,
    BotCommands.PROFILE,
    BotCommands.VIEW_BUYCARD,
    BotCommands.MONITOR_BUY_CARD,
    BotCommands.OFF_MONITOR_BUY_CARD,
    BotCommands.MASTERFUND_VINACHAIN,
    BotCommands.MONITOR_MASTER_FUND,
    BotCommands.OFF_MONITOR_MASTER_FUND,
  ],
  ADVANCED: [BotCommands.ADVANCED],
  ADMIN: [
    BotCommands.ADMIN,
    BotCommands.STATS,
    BotCommands.USERS,
    BotCommands.PARTNERS,
    BotCommands.ADD_PARTNER,
    BotCommands.EDIT_PARTNER,
    BotCommands.DELETE_PARTNER,
    BotCommands.CLEAR_CACHE,
    BotCommands.API_STATUS,
  ],
  DEV: [BotCommands.DEV, BotCommands.LOGS, BotCommands.DEBUG, BotCommands.SPAM],
};

/**
 * Commands that are implemented
 */
export const IMPLEMENTED_COMMANDS: Set<BotCommands> = new Set([
  BotCommands.START,
  BotCommands.HELP,
  BotCommands.PROFILE,
  BotCommands.ADMIN,
  BotCommands.STATS,
  BotCommands.VIEW_BUYCARD,
  BotCommands.MONITOR_BUY_CARD,
  BotCommands.OFF_MONITOR_BUY_CARD,
  BotCommands.MASTERFUND_VINACHAIN,
  BotCommands.MONITOR_MASTER_FUND,
  BotCommands.OFF_MONITOR_MASTER_FUND,
  BotCommands.PARTNERS,
  BotCommands.ADD_PARTNER,
  BotCommands.EDIT_PARTNER,
  BotCommands.DELETE_PARTNER,
  BotCommands.CLEAR_CACHE,
  BotCommands.API_STATUS,
  BotCommands.SPAM,
]);

/**
 * Helper function to get command description
 */
export const getCommandDescription = (command: BotCommands): string => {
  return COMMAND_DESCRIPTIONS[command] || 'No description available';
};
