// Import required libraries
import { IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Import enum
import { UserRole } from '../../auth/enums/user-role.enum';

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
    description: 'User's Telegram ID to update role',
    example: 987654321,
  })
  @IsNumber()
  targetTelegramId: number;

  @ApiProperty({
    description: 'New role to update',
    example: UserRole.ADMIN,
    enum: UserRole,
  })
  @IsEnum(UserRole)
  newRole: UserRole;
}
