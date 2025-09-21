import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escapeMarkdownV2 } from '@shared/message_builder';

export interface MasterFundResponse {
  success: boolean;
  message: string;
  data?: {
    balance: number;
    currency: string;
    wallets: Array<{
      network: string;
      address: string;
    }>;
  };
}

@Injectable()
export class MasterFundVinachainService {
  private readonly logger = new Logger(MasterFundVinachainService.name);
  private readonly apiUrl = process.env.URL_MASTERFUND_VINACHAIN;
  private readonly token = process.env.TOKEN_MASTERFUND_VINACHAIN;

  constructor(
    private configService: ConfigService,
  ) {}

  /**
   * Lấy thông tin Master Fund từ Vinachain API
   */
  async getMasterFundInfo(): Promise<MasterFundResponse> {
    try {
      if (!this.apiUrl) {
        throw new Error('API URL is not configured');
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.logger.error(`HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success !== true) {
        this.logger.error('API returned error');
        throw new Error('API returned error');
      }

      const fundInfo = data.data;
      const balance = fundInfo.balance;
      const currency = fundInfo.currency;
      const wallets = fundInfo.walletAddress;

      return {
        success: true,
        message: 'Thành công',
        data: {
          balance,
          currency,
          wallets
        }
      };
    } catch (error) {
      this.logger.error('Error fetching Master Fund info:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Tạo message hiển thị thông tin Master Fund
   */
  buildMasterFundMessage(
    balance: number,
    currency: string,
    wallets: Array<{ network: string; address: string }>,
    isAuthorized: boolean = false,
    userRole?: string
  ): string {
    const header = escapeMarkdownV2('Master Fund Balance');
    const currencyLabel = escapeMarkdownV2('Currency:');
    const balanceLabel = escapeMarkdownV2('Balance:');
    const walletLabel = escapeMarkdownV2('Wallet Addresses:');
    const partnerWalletLabel = escapeMarkdownV2('Master Fund Deposit Wallet:');
    const lastUpdate = escapeMarkdownV2('Last Updated:');
    
    let resultText = `${header}\n\n` +
      `*${currencyLabel}* ${escapeMarkdownV2(currency)}\n` +
      `*${balanceLabel}* ${escapeMarkdownV2(balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} ${escapeMarkdownV2(currency)}\n\n`;

    // Hiển thị wallet addresses dựa trên role
    if (userRole === 'ADMIN' || userRole === 'DEV') {
      // Admin và Dev: hiển thị tất cả wallets + partner wallet
      const walletList = wallets.map((wallet, index) => {
        return `${index + 1}\\. ${escapeMarkdownV2(wallet.network)}: 🔴 \`${escapeMarkdownV2(wallet.address)}\``;
      }).join('\n');
      resultText += `*${walletLabel}*\n${walletList}\n\n`;
      
      // Thêm partner wallet
      resultText += `*${escapeMarkdownV2('Partner Deposit Wallet')}* 🔴 \`0x1ef3355161464d2465e3591d536ea74ab88de1ef\`\n\n`;
    } else {
      // User và Advanced User: chỉ hiển thị partner wallet
      resultText += `*${partnerWalletLabel}* 🔴 \`0x1ef3355161464d2465e3591d536ea74ab88de1ef\`\n\n`;
    }

    resultText += `_${lastUpdate} ${escapeMarkdownV2(new Date().toLocaleString('vi-VN'))}_`;
    return resultText;
  }

  /**
   * Kiểm tra xem user có được authorize không
   */
  isAuthorizedUser(chatId: number): boolean {
    const telegramChatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    return Boolean(telegramChatId && chatId.toString() === telegramChatId.toString());
  }
}