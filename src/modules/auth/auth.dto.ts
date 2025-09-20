// Import các thư viện cần thiết
import { IsNumber, IsString, IsOptional, IsEnum, IsBoolean, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Import enum
import { UserRole } from './enums/user-role.enum';

/**
 * DTO cho việc tạo/cập nhật user
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'ID duy nhất của user trên Telegram',
    example: 123456789,
  })
  @IsNumber()
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Username trên Telegram',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Tên đầu của user',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Tên cuối của user',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Mã ngôn ngữ của user',
    example: 'vi',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Role của user trong hệ thống',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của user',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO cho việc cập nhật user
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Username trên Telegram',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Tên đầu của user',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Tên cuối của user',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Mã ngôn ngữ của user',
    example: 'vi',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Role của user trong hệ thống',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của user',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO cho việc cập nhật role của user
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Telegram ID của admin thực hiện thao tác',
    example: 123456789,
  })
  @IsNumber()
  adminTelegramId: number;

  @ApiProperty({
    description: 'Telegram ID của user cần cập nhật role',
    example: 987654321,
  })
  @IsNumber()
  targetTelegramId: number;

  @ApiProperty({
    description: 'Role mới cần cập nhật',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  newRole: UserRole;
}

/**
 * DTO cho response user
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'ID duy nhất của user trên Telegram',
    example: 123456789,
  })
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Username trên Telegram',
    example: 'john_doe',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Tên đầu của user',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Tên cuối của user',
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Mã ngôn ngữ của user',
    example: 'vi',
  })
  languageCode?: string;

  @ApiProperty({
    description: 'Role của user trong hệ thống',
    enum: UserRole,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Trạng thái hoạt động của user',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Thời gian tạo user',
  })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Thời gian cập nhật cuối',
  })
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;

  @ApiProperty({
    description: 'Thời gian hoạt động cuối',
  })
  @Type(() => Date)
  @IsDate()
  lastActiveAt: Date;
}

/**
 * DTO cho thống kê users
 */
export class UserStatsDto {
  @ApiProperty({
    description: 'Tổng số users',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Số users theo từng role',
    example: {
      DEV: 1,
      ADMIN: 2,
      ADVANCED_USER: 5,
      USER: 92,
    },
  })
  byRole: Record<UserRole, number>;

  @ApiProperty({
    description: 'Số users hoạt động hôm nay',
    example: 25,
  })
  activeToday: number;
}

/**
 * DTO cho việc tìm kiếm users
 */
export class FindUsersDto {
  @ApiPropertyOptional({
    description: 'Role cần lọc',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Số trang (pagination)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Số lượng items per page',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
