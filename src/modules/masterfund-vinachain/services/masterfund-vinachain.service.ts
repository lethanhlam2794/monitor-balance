import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escapeMarkdownV2 } from '@shared/message_builder';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

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
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(
    private configService: ConfigService,
    private discordWebhook: DiscordWebhookService,
  ) {
    this.apiUrl =
      this.configService.get<string>('URL_MASTERFUND_VINACHAIN') || '';
    this.token =
      this.configService.get<string>('TOKEN_MASTERFUND_VINACHAIN') || '';
  }

  /**
   * Lấy thông tin Master Fund từ Vinachain API
   */
  async getMasterFundInfo(): Promise<MasterFundResponse> {
    try {
      if (!this.apiUrl) {
        const errorMsg = 'API URL is not configured';
        await this.discordWebhook.auditWebhook(
          'MasterFund config error',
          errorMsg,
          { apiUrl: this.apiUrl, token: this.token ? 'configured' : 'missing' },
        );
        throw new Error(errorMsg);
      }

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        this.logger.error(errorMsg);

        // Bắn audit với chi tiết HTTP error
        await this.discordWebhook.auditWebhook(
          'MasterFund HTTP error',
          errorMsg,
          {
            apiUrl: this.apiUrl,
            status: response.status,
            statusText: response.statusText,
            token: this.token ? 'configured' : 'missing',
          },
        );

        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Bắn audit cho tất cả response từ Vinachain API
      const isSuccess = data.success === true;
      await this.discordWebhook.auditWebhook(
        isSuccess ? 'MasterFund API success' : 'MasterFund API error',
        isSuccess
          ? 'Vinachain API call successful'
          : `API returned error: ${data.message || 'Unknown error'}`,
        {
          apiUrl: this.apiUrl,
          token: this.token ? 'configured' : 'missing',
          apiResponse: data,
          isSuccess,
        },
      );

      if (!isSuccess) {
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
          wallets,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching Master Fund info:', error);

      // Bắn audit cho exception
      await this.discordWebhook.auditWebhook(
        'MasterFund exception',
        'Unexpected exception in getMasterFundInfo',
        {
          apiUrl: this.apiUrl,
          token: this.token ? 'configured' : 'missing',
          error: (error as any)?.message || String(error),
        },
      );

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
    userRole?: string,
  ): string {
    const header = escapeMarkdownV2('Master Fund Balance');
    const currencyLabel = escapeMarkdownV2('Currency:');
    const balanceLabel = escapeMarkdownV2('Balance:');
    const walletLabel = escapeMarkdownV2('Wallet Addresses:');
    const partnerWalletLabel = escapeMarkdownV2('Master Fund Deposit Wallet:');
    const lastUpdate = escapeMarkdownV2('Last Updated:');

    let resultText =
      `${header}\n\n` +
      `*${currencyLabel}* ${escapeMarkdownV2(currency)}\n` +
      `*${balanceLabel}* ${escapeMarkdownV2(balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} ${escapeMarkdownV2(currency)}\n\n`;

    // Hiển thị wallet addresses dựa trên role
    if (userRole === 'ADMIN' || userRole === 'DEV') {
      // Admin và Dev: hiển thị tất cả wallets + partner wallet
      const walletList = wallets
        .map((wallet, index) => {
          return `${index + 1}\\. ${escapeMarkdownV2(wallet.network)}: 🔴 \`${escapeMarkdownV2(wallet.address)}\``;
        })
        .join('\n');
      resultText += `*${walletLabel}*\n${walletList}\n\n`;

      // Thêm partner wallet
      resultText += `*${escapeMarkdownV2('Partner Deposit Wallet')}* 🔴 \`${this.getPartnerWalletAddress()}\`\n\n`;
    } else {
      // User và Advanced User: chỉ hiển thị partner wallet
      resultText += `*${partnerWalletLabel}* 🔴 \`${this.getPartnerWalletAddress()}\`\n\n`;
    }

    resultText += `_${lastUpdate} ${escapeMarkdownV2(new Date().toLocaleString('vi-VN'))}_`;
    return resultText;
  }

  /**
   * Lấy partner wallet address
   */
  getPartnerWalletAddress(): string {
    return (
      this.configService.get<string>('WALLET_DEPOSIT_MASTER_FUND') ||
      'address not found'
    );
  }

  /**
   * Kiểm tra xem user có được authorize không
   */
  isAuthorizedUser(chatId: number): boolean {
    const telegramChatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    return Boolean(
      telegramChatId && chatId.toString() === telegramChatId.toString(),
    );
  }
}
