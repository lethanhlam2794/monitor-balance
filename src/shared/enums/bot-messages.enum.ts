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
  [BotMessages.WELCOME]: ` **Chào mừng đến với Telegram Bot!**

Tôi là bot hỗ trợ của bạn. Dưới đây là các tính năng có sẵn:

 **Commands cơ bản:**
• /help - Xem hướng dẫn chi tiết
• /profile - Xem thông tin profile
• /start - Khởi động lại bot

Sử dụng /help để xem thêm thông tin chi tiết!`,

  // ===========================================
  // HELP MESSAGES
  // ===========================================
  [BotMessages.HELP_HEADER]: ` **Hướng dẫn sử dụng Bot**\n\n`,
  [BotMessages.HELP_FOOTER]: ` **Lưu ý:** Một số commands chỉ khả dụng với role phù hợp.`,

  // ===========================================
  // PROFILE MESSAGES
  // ===========================================
  [BotMessages.PROFILE_HEADER]: ` Thông tin Profile\n\n`,
  [BotMessages.PROFILE_TELEGRAM_ID]: ` Telegram ID: `,
  [BotMessages.PROFILE_NAME]: ` Tên: `,
  [BotMessages.PROFILE_USERNAME]: ` Username: `,
  [BotMessages.PROFILE_LANGUAGE]: ` Ngôn ngữ: `,
  [BotMessages.PROFILE_ROLE]: ` Role: `,
  [BotMessages.PROFILE_JOINED]: ` Tham gia: `,
  [BotMessages.PROFILE_LAST_ACTIVE]: ` Hoạt động cuối: `,
  [BotMessages.PROFILE_STATUS]: ` Trạng thái: `,
  [BotMessages.PROFILE_NO_USERNAME]: `Không có`,
  [BotMessages.PROFILE_UNKNOWN_LANGUAGE]: `Không xác định`,
  [BotMessages.PROFILE_ACTIVE]: `Hoạt động`,
  [BotMessages.PROFILE_INACTIVE]: `Không hoạt động`,

  // ===========================================
  // ADMIN MESSAGES
  // ===========================================
  [BotMessages.ADMIN_PANEL]: ` **Admin Panel**

 **Quản lý Users:**
• /users - Danh sách users
• /promote <user_id> <role> - Nâng cấp role
• /demote <user_id> - Hạ cấp role

 **Thống kê:**
• /stats - Thống kê hệ thống

 **Cài đặt:**
• /settings - Cài đặt bot`,

  // ===========================================
  // STATS MESSAGES
  // ===========================================
  [BotMessages.STATS_HEADER]: ` **Thống kê hệ thống**\n\n`,
  [BotMessages.STATS_TOTAL_USERS]: ` **Tổng users:** `,
  [BotMessages.STATS_ACTIVE_TODAY]: ` **Hoạt động hôm nay:** `,
  [BotMessages.STATS_ROLE_DISTRIBUTION]: ` **Phân bố theo role:**`,
  [BotMessages.STATS_DEV_COUNT]: `•  Developer: `,
  [BotMessages.STATS_ADMIN_COUNT]: `•  Admin: `,
  [BotMessages.STATS_ADVANCED_COUNT]: `•  Advanced User: `,
  [BotMessages.STATS_USER_COUNT]: `•  User thường: `,

  // ===========================================
  // BUY CARD MESSAGES
  // ===========================================
  [BotMessages.BUY_CARD_LOADING]: `Đang kiểm tra số dư...`,
  [BotMessages.BUY_CARD_HEADER]: `Thông tin Quỹ Mua Thẻ\n\n`,
  [BotMessages.BUY_CARD_WALLET]: `Địa chỉ ví: `,
  [BotMessages.BUY_CARD_TOKEN]: `Token: `,
  [BotMessages.BUY_CARD_BALANCE]: `Số dư: `,
  [BotMessages.BUY_CARD_NETWORK]: `Mạng: BSC (Chain ID: `,
  [BotMessages.BUY_CARD_LAST_UPDATE]: `Cập nhật lần cuối: `,

  // ===========================================
  // ERROR MESSAGES
  // ===========================================
  [BotMessages.ERROR_GENERAL]: ` Có lỗi xảy ra, vui lòng thử lại sau.`,
  [BotMessages.ERROR_USER_NOT_FOUND]: ` Không tìm thấy thông tin user.`,
  [BotMessages.ERROR_NO_PERMISSION]: ` Bạn không có quyền truy cập tính năng này.`,
  [BotMessages.ERROR_UNSUPPORTED_COMMAND]: ` Command không được hỗ trợ. Sử dụng /help để xem danh sách commands.`,
  [BotMessages.ERROR_MISSING_ADDRESS_BUY_CARD]: ` Lỗi cấu hình: Thiếu ADDRESS_BUY_CARD trong environment variables.`,
  [BotMessages.ERROR_MISSING_CONTRACT_ADDRESS]: ` Lỗi cấu hình: Thiếu CONTRACT_ADDRESS_USDT trong environment variables.`,
  [BotMessages.ERROR_BALANCE_FETCH_FAILED]: ` Không thể lấy thông tin balance. Vui lòng thử lại sau.`,
  [BotMessages.ERROR_BALANCE_CHECK_FAILED]: ` Có lỗi xảy ra khi kiểm tra balance. Vui lòng thử lại sau.`,

  // ===========================================
  // CALLBACK QUERY RESPONSES
  // ===========================================
  [BotMessages.CALLBACK_FEATURE_DEVELOPING]: `Tính năng đang được phát triển`,
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
