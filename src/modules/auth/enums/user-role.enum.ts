/**
 * Enum định nghĩa các role của user trong hệ thống
 * Thứ tự từ cao xuống thấp: DEV > ADMIN > ADVANCED_USER > USER
 */
export enum UserRole {
  /** Developer - Quyền cao nhất, có thể làm mọi thứ */
  DEV = 'DEV',
  
  /** Administrator - Quản lý hệ thống, có thể quản lý users */
  ADMIN = 'ADMIN',
  
  /** User nâng cao - Có thêm một số quyền đặc biệt */
  ADVANCED_USER = 'ADVANCED_USER',
  
  /** User thường - Quyền cơ bản */
  USER = 'USER',
}

/**
 * Mapping role với mô tả
 */
export const ROLE_DESCRIPTIONS = {
  [UserRole.DEV]: 'Developer - Quyền cao nhất',
  [UserRole.ADMIN]: 'Administrator - Quản lý hệ thống',
  [UserRole.ADVANCED_USER]: 'User nâng cao - Có quyền đặc biệt',
  [UserRole.USER]: 'User thường - Quyền cơ bản',
} as const;
