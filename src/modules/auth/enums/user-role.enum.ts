/**
 * Enum defining user roles in system
 * Order from high to low: DEV > ADMIN > ADVANCED_USER > USER
 */
export enum UserRole {
  /** Developer - Highest privileges, can do everything */
  DEV = 'DEV',
  
  /** Administrator - System management, can manage users */
  ADMIN = 'ADMIN',
  
  /** Advanced User - Has additional special privileges */
  ADVANCED_USER = 'ADVANCED_USER',
  
  /** Regular User - Basic privileges */
  USER = 'USER',
}

/**
 * Role mapping with description
 */
export const ROLE_DESCRIPTIONS = {
  [UserRole.DEV]: 'Developer - Highest privileges',
  [UserRole.ADMIN]: 'Administrator - System management',
  [UserRole.ADVANCED_USER]: 'Advanced User - Has special privileges',
  [UserRole.USER]: 'Regular User - Basic privileges',
} as const;
