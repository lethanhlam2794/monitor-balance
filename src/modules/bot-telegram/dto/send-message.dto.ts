// Import required libraries
import { IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for sending message via Telegram
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Chat/group ID to send message',
    example: 123456789,
  })
  @IsNumber()
  chatId: number;

  @ApiProperty({
    description: 'Message content to send',
    example: 'Hello! This is a message from the bot.',
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
