// Import required libraries
import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Import enum
import { UserRole } from './enums/user-role.enum';

/**
 * DTO for creating/updating user
 */
export class CreateUserDto {
  @ApiProperty({
    description: "User's unique ID on Telegram",
    example: 123456789,
  })
  @IsNumber()
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Username on Telegram',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: "User's first name",
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: "User's language code",
    example: 'vi',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'User role in system',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating user
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Username on Telegram',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: "User's first name",
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: "User's language code",
    example: 'vi',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'User role in system',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating user role
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Telegram ID of admin performing the operation',
    example: 123456789,
  })
  @IsNumber()
  adminTelegramId: number;

  @ApiProperty({
    description: "User's Telegram ID to update role",
    example: 987654321,
  })
  @IsNumber()
  targetTelegramId: number;

  @ApiProperty({
    description: 'New role to update',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  newRole: UserRole;
}

/**
 * DTO for user response
 */
export class UserResponseDto {
  @ApiProperty({
    description: "User's unique ID on Telegram",
    example: 123456789,
  })
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Username on Telegram',
    example: 'john_doe',
  })
  username?: string;

  @ApiPropertyOptional({
    description: "User's first name",
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: "User's language code",
    example: 'vi',
  })
  languageCode?: string;

  @ApiProperty({
    description: 'User role in system',
    enum: UserRole,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User active status',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'User creation time',
  })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Last update time',
  })
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;

  @ApiProperty({
    description: 'Last activity time',
  })
  @Type(() => Date)
  @IsDate()
  lastActiveAt: Date;
}

/**
 * DTO for user statistics
 */
export class UserStatsDto {
  @ApiProperty({
    description: 'Total users',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Number of users by role',
    example: {
      DEV: 1,
      ADMIN: 2,
      ADVANCED_USER: 5,
      USER: 92,
    },
  })
  byRole: Record<UserRole, number>;

  @ApiProperty({
    description: 'Number of active users today',
    example: 25,
  })
  activeToday: number;
}

/**
 * DTO for searching users
 */
export class FindUsersDto {
  @ApiPropertyOptional({
    description: 'Role to filter',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (pagination)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
