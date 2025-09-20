// Import các thư viện cần thiết
import { IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Import enum
import { UserRole } from '../../auth/enums/user-role.enum';

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
    example: UserRole.ADMIN,
    enum: UserRole,
  })
  @IsEnum(UserRole)
  newRole: UserRole;
}
