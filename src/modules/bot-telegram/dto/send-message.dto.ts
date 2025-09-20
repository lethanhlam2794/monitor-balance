// Import các thư viện cần thiết
import { IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho việc gửi message qua Telegram
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'ID của chat/group để gửi message',
    example: 123456789,
  })
  @IsNumber()
  chatId: number;

  @ApiProperty({
    description: 'Nội dung message cần gửi',
    example: 'Xin chào! Đây là message từ bot.',
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({
    description: 'Parse mode cho message (Markdown, HTML)',
    example: 'Markdown',
    enum: ['Markdown', 'HTML'],
  })
  @IsOptional()
  @IsString()
  parseMode?: 'Markdown' | 'HTML';

  @ApiPropertyOptional({
    description: 'Inline keyboard markup (JSON object)',
    example: {
      inline_keyboard: [
        [
          { text: 'Button 1', callback_data: 'button1' },
          { text: 'Button 2', callback_data: 'button2' }
        ]
      ]
    },
  })
  @IsOptional()
  @IsObject()
  replyMarkup?: any;
}
