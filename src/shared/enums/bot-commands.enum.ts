/**
 * Enum cho các Bot Commands
 * Quản lý tất cả commands của Telegram Bot
 */

export enum BotCommands {
  // ===========================================
  // BASIC COMMANDS (Tất cả users)
  // ===========================================
  START = '/start',
  HELP = '/help',
  PROFILE = '/profile',
  VIEW_BUYCARD = '/view_buycard',
  MONITOR_BUY_CARD = '/monitor_buy_card',
  MASTERFUND_VINACHAIN = '/masterfund_vinachain',
  MONITOR_MASTER_FUND = '/monitor_master_fund',
  // ===========================================
  // ADVANCED COMMANDS (Advanced User trở lên)
  // ===========================================
  ADVANCED = '/advanced',

  // ===========================================
  // ADMIN COMMANDS (Admin trở lên)
  // ===========================================
  ADMIN = '/admin',
  STATS = '/stats',
  USERS = '/users',

  // ===========================================
  // DEV COMMANDS (Dev only)
  // ===========================================
  DEV = '/dev',
  LOGS = '/logs',
  DEBUG = '/debug',
}

/**
 * Mô tả cho từng command
 */
export const COMMAND_DESCRIPTIONS: Record<BotCommands, string> = {
  [BotCommands.START]: 'Khởi động bot',
  [BotCommands.HELP]: 'Xem hướng dẫn này',
  [BotCommands.PROFILE]: 'Xem thông tin profile',
  [BotCommands.VIEW_BUYCARD]: 'Xem balance Buy Card Fund',
  [BotCommands.MONITOR_BUY_CARD]: 'Đặt lịch nhắc kiểm tra balance buy card',
  [BotCommands.MASTERFUND_VINACHAIN]: 'Xem thông tin Master Fund Vinachain',
  [BotCommands.MONITOR_MASTER_FUND]: 'Đặt lịch nhắc kiểm tra Master Fund',
  [BotCommands.ADVANCED]: 'Tính năng nâng cao (đang phát triển)',
  [BotCommands.ADMIN]: 'Panel quản trị',
  [BotCommands.STATS]: 'Thống kê hệ thống',
  [BotCommands.USERS]: 'Quản lý users (đang phát triển)',
  [BotCommands.DEV]: 'Developer tools (đang phát triển)', 
  [BotCommands.LOGS]: 'Xem system logs (đang phát triển)',
  [BotCommands.DEBUG]: 'Debug mode (đang phát triển)',
};

/**
 * Phân loại commands theo role
 */
export const COMMANDS_BY_ROLE = {
  BASIC: [
    BotCommands.START,
    BotCommands.HELP,
    BotCommands.PROFILE,
    BotCommands.VIEW_BUYCARD,
    BotCommands.MONITOR_BUY_CARD,
    BotCommands.MASTERFUND_VINACHAIN,
    BotCommands.MONITOR_MASTER_FUND,
  ],
  ADVANCED: [
    BotCommands.ADVANCED,
  ],
  ADMIN: [
    BotCommands.ADMIN,
    BotCommands.STATS,
    BotCommands.USERS,
  ],
  DEV: [
    BotCommands.DEV,
    BotCommands.LOGS,
    BotCommands.DEBUG,
  ],
};

/**
 * Commands đã được implement
 */
export const IMPLEMENTED_COMMANDS: Set<BotCommands> = new Set([
  BotCommands.START,
  BotCommands.HELP,
  BotCommands.PROFILE,
  BotCommands.ADMIN,
  BotCommands.STATS,
  BotCommands.VIEW_BUYCARD,
  BotCommands.MONITOR_BUY_CARD,
  BotCommands.MASTERFUND_VINACHAIN,
  BotCommands.MONITOR_MASTER_FUND,
  ]);

/**
 * Helper function để kiểm tra command có được implement chưa
 */
export const isCommandImplemented = (command: BotCommands): boolean => {
  return IMPLEMENTED_COMMANDS.has(command);
};

/**
 * Helper function để lấy description của command
 */
export const getCommandDescription = (command: BotCommands): string => {
  return COMMAND_DESCRIPTIONS[command];
};
