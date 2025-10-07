// Import các thư viện cần thiết
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ERR_CODE } from '@shared/constants';
import { DiscordWebhookService } from '@shared/services/discord-webhook.service';

/**
 * Interface cho Etherscan API response
 */
interface EtherscanResponse {
  status: string;
  message: string;
  result: string;
}

/**
 * Interface cho token balance info
 */
interface TokenBalanceInfo {
  address: string;
  contractAddress: string;
  balance: string;
  balanceFormatted: string;
  symbol: string;
  decimals: number;
}

/**
 * Service để tương tác với Etherscan API
 */
@Injectable()
export class EtherscanService {
  private readonly logger = new Logger(EtherscanService.name);
  private readonly primaryApiKey: string;
  private readonly fallbackApiKey: string;
  private readonly baseUrl = 'https://api.etherscan.io/v2/api';
  private currentApiKey: string;
  private apiKeyErrors: Map<string, number> = new Map();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private discordWebhook: DiscordWebhookService,
  ) {
    this.primaryApiKey =
      this.configService.get<string>('ETHERSCAN_API_KEY') || '';
    this.fallbackApiKey =
      this.configService.get<string>('ETHERSCAN_API_KEY_2') || '';
    this.currentApiKey = this.primaryApiKey;

    if (!this.primaryApiKey) {
      this.logger.error('ETHERSCAN_API_KEY not found in environment variables');
    }
    if (!this.fallbackApiKey) {
      this.logger.warn(
        'ETHERSCAN_API_KEY_2 not found in environment variables - no fallback available',
      );
    }
  }

  /**
   * Lấy token balance từ Etherscan API
   * @param address - Địa chỉ ví cần kiểm tra
   * @param contractAddress - Địa chỉ contract của token
   * @param chainId - Chain ID (56 = BSC, 1 = Ethereum)
   * @returns Token balance info
   */
  async getTokenBalance(
    address: string,
    contractAddress: string,
    chainId: number = 56,
  ): Promise<TokenBalanceInfo | null> {
    // Try primary API key first
    let result = await this.tryApiCall(
      address,
      contractAddress,
      chainId,
      this.primaryApiKey,
    );

    if (result) {
      return result;
    }

    // If primary key fails and fallback key exists, try fallback
    if (this.fallbackApiKey && this.currentApiKey !== this.fallbackApiKey) {
      this.logger.warn('Primary API key failed, trying fallback API key...');
      this.currentApiKey = this.fallbackApiKey;
      result = await this.tryApiCall(
        address,
        contractAddress,
        chainId,
        this.fallbackApiKey,
      );

      if (result) {
        this.logger.log('Fallback API key successful');
        return result;
      }
    }

    // Both API keys failed
    this.logger.error('Both primary and fallback API keys failed');
    // Send audit to Discord with latest error info
    const lastPrimaryErr = this.apiKeyErrors.get(this.primaryApiKey) || 0;
    const lastFallbackErr = this.apiKeyErrors.get(this.fallbackApiKey) || 0;
    await this.discordWebhook.auditWebhook(
      'Etherscan API keys failed',
      'Both primary and fallback API keys failed when fetching token balance.',
      {
        address,
        contractAddress,
        chainId,
        primaryKeyPrefix: this.primaryApiKey
          ? this.primaryApiKey.substring(0, 8)
          : '',
        fallbackKeyPrefix: this.fallbackApiKey
          ? this.fallbackApiKey.substring(0, 8)
          : '',
        errorCounters: {
          primary: lastPrimaryErr,
          fallback: lastFallbackErr,
        },
      },
    );
    return null;
  }

  private async tryApiCall(
    address: string,
    contractAddress: string,
    chainId: number,
    apiKey: string,
  ): Promise<TokenBalanceInfo | null> {
    try {
      if (!apiKey) {
        this.logger.error('API key is empty');
        return null;
      }

      const url = `${this.baseUrl}`;
      const params = {
        chainid: chainId,
        module: 'account',
        action: 'tokenbalance',
        contractaddress: contractAddress,
        address: address,
        tag: 'latest',
        apikey: apiKey,
      };

      this.logger.log(
        `Fetching token balance for address: ${address} with API key: ${apiKey.substring(0, 8)}...`,
      );

      const response = await firstValueFrom(
        this.httpService.get<EtherscanResponse>(url, { params }),
      );

      // Send audit for all responses from Etherscan
      const isSuccess =
        response.data.status === '1' && response.data.message === 'OK';

      await this.discordWebhook.auditWebhook(
        isSuccess ? 'Etherscan API success' : 'Etherscan API response',
        isSuccess
          ? `API call successful for address ${address}`
          : `API responded: ${response.data.message}`,
        {
          apiKeyPrefix: apiKey.substring(0, 8),
          address,
          contractAddress,
          chainId,
          etherscanResponse: response.data,
          isSuccess,
        },
      );

      if (isSuccess) {
        const balance = response.data.result;
        const balanceFormatted = this.formatTokenBalance(balance, 18); // USDT has 18 decimals

        // Reset error count for this API key
        this.apiKeyErrors.delete(apiKey);

        return {
          address,
          contractAddress,
          balance,
          balanceFormatted,
          symbol: 'USDT',
          decimals: 18,
        };
      } else {
        // Increase error count for this API key
        const errorCount = (this.apiKeyErrors.get(apiKey) || 0) + 1;
        this.apiKeyErrors.set(apiKey, errorCount);

        // Check if it's a temporary API error (rate limit, maintenance)
        if (
          response.data.message.includes('temporarily unavailable') ||
          response.data.message.includes('rate limit') ||
          response.data.message.includes('maintenance')
        ) {
          this.logger.warn(
            `Etherscan API temporarily unavailable: ${response.data.message} (Error count: ${errorCount})`,
          );
        } else {
          this.logger.error(
            `Etherscan API error: ${response.data.message} (Error count: ${errorCount})`,
          );
        }
        return null;
      }
    } catch (error) {
      // Increase error count for this API key
      const errorCount = (this.apiKeyErrors.get(apiKey) || 0) + 1;
      this.apiKeyErrors.set(apiKey, errorCount);

      this.logger.error(
        `Error fetching token balance with API key ${apiKey.substring(0, 8)}... (Error count: ${errorCount}):`,
        error,
      );
      // Send audit with exception details
      await this.discordWebhook.auditWebhook(
        'Exception calling Etherscan',
        'Unexpected exception occurred while calling Etherscan API',
        {
          apiKeyPrefix: apiKey.substring(0, 8),
          address,
          contractAddress,
          chainId,
          error: (error as any)?.message || String(error),
        },
      );
      return null;
    }
  }

  /**
   * Format token balance từ wei sang readable format
   * @param balance - Balance dưới dạng string (wei)
   * @param decimals - Số decimals của token
   * @returns Formatted balance string
   */
  private formatTokenBalance(balance: string, decimals: number): string {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);

      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;

      if (fractionalPart === 0n) {
        return wholePart.toString();
      }

      // Format fractional part với 6 decimal places
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '');

      if (trimmedFractional === '') {
        return wholePart.toString();
      }

      return `${wholePart}.${trimmedFractional}`;
    } catch (error) {
      this.logger.error('Error formatting token balance:', error);
      return balance;
    }
  }

  /**
   * Lấy thông tin token từ contract address
   * @param contractAddress - Địa chỉ contract
   * @returns Token info
   */
  getTokenInfo(contractAddress: string): {
    symbol: string;
    decimals: number;
    name: string;
  } {
    // Mapping các token phổ biến
    const tokenMap: Record<
      string,
      { symbol: string; decimals: number; name: string }
    > = {
      '0x55d398326f99059fF775485246999027B3197955': {
        symbol: 'USDT',
        decimals: 18,
        name: 'Tether USD',
      },
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
        symbol: 'USDC',
        decimals: 18,
        name: 'USD Coin',
      },
      '0xe9e7cea3dedca5984780bafc599bd69add087d56': {
        symbol: 'BUSD',
        decimals: 18,
        name: 'Binance USD',
      },
    };

    return (
      tokenMap[contractAddress.toLowerCase()] || {
        symbol: 'UNKNOWN',
        decimals: 18,
        name: 'Unknown Token',
      }
    );
  }
}
