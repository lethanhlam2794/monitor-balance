// Import các thư viện cần thiết
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ERR_CODE } from '@shared/constants';

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
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.etherscan.io/v2/api';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('ETHERSCAN_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('ETHERSCAN_API_KEY not found in environment variables');
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
    chainId: number = 56
  ): Promise<TokenBalanceInfo | null> {
    try {
      if (!this.apiKey) {
        this.logger.error('ERR_CODE.MISSING_ENV_VARIABLE');
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
        apikey: this.apiKey,
      };

      this.logger.log(`Fetching token balance for address: ${address}`);
      
      const response = await firstValueFrom(
        this.httpService.get<EtherscanResponse>(url, { params })
      );

      if (response.data.status === '1' && response.data.message === 'OK') {
        const balance = response.data.result;
        const balanceFormatted = this.formatTokenBalance(balance, 18); // USDT có 18 decimals
        
        return {
          address,
          contractAddress,
          balance,
          balanceFormatted,
          symbol: 'USDT',
          decimals: 18,
        };
      } else {
        this.logger.error(`Etherscan API error: ${response.data.message}`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching token balance:', error);
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
  getTokenInfo(contractAddress: string): { symbol: string; decimals: number; name: string } {
    // Mapping các token phổ biến
    const tokenMap: Record<string, { symbol: string; decimals: number; name: string }> = {
      '0x55d398326f99059fF775485246999027B3197955': {
        symbol: 'USDT',
        decimals: 18,
        name: 'Tether USD'
      },
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
        symbol: 'USDC',
        decimals: 18,
        name: 'USD Coin'
      },
      '0xe9e7cea3dedca5984780bafc599bd69add087d56': {
        symbol: 'BUSD',
        decimals: 18,
        name: 'Binance USD'
      },
    };

    return tokenMap[contractAddress.toLowerCase()] || {
      symbol: 'UNKNOWN',
      decimals: 18,
      name: 'Unknown Token'
    };
  }
}
