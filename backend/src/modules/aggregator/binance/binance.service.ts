import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialProvider, RateSource } from '@prisma/client';
import { createHmac } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AesService } from '../../../common/crypto/aes.service';
import { CurrencyRatesService } from '../../../common/currency-rates/currency-rates.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { buildRefreshSummary } from '../../../common/utils/refresh-summary';
import {
  BinanceAccountResponse,
  BinanceTickerPriceResponse,
} from './binance.types';

interface BinanceServerTimeResponse {
  serverTime: number;
}

@Injectable()
export class BinanceService {
  private readonly baseUrl: string;
  private readonly logger = new Logger(BinanceService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly aesService: AesService,
    private readonly currencyRatesService: CurrencyRatesService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BINANCE_BASE_URL',
      'https://api.binance.com',
    );
  }

  async refreshAsset(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        credential: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.credential?.provider !== CredentialProvider.BINANCE) {
      throw new BadRequestException('Asset is not configured for Binance');
    }

    if (!asset.credential.encryptedSecret || !asset.credential.secretIv) {
      throw new BadRequestException('Binance credential is missing apiSecret');
    }

    const apiKey = this.aesService.decrypt(
      asset.credential.encryptedKey,
      asset.credential.keyIv,
    );
    const apiSecret = this.aesService.decrypt(
      asset.credential.encryptedSecret,
      asset.credential.secretIv,
    );

    const account = await this.getAccountInfo(apiKey, apiSecret);
    const matchingBalance = account.balances.find(
      (balance) => balance.asset.toUpperCase() === asset.currency.toUpperCase(),
    );

    const totalBalance = matchingBalance
      ? Number(matchingBalance.free) + Number(matchingBalance.locked)
      : 0;

    await this.tryUpdateCurrencyRate(asset.currency);

    return this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        balance: totalBalance,
        isAuto: true,
      },
      include: {
        credential: {
          select: {
            provider: true,
          },
        },
      },
    });
  }

  async refreshAutoAssets() {
    const assets = await this.prisma.asset.findMany({
      where: {
        isAuto: true,
        credential: {
          provider: CredentialProvider.BINANCE,
        },
      },
      select: {
        id: true,
      },
    });

    const results = await Promise.allSettled(
      assets.map((asset) => this.refreshAsset(asset.id)),
    );

    return buildRefreshSummary(
      assets.map((asset) => asset.id),
      results,
      'Unknown Binance refresh error',
      (error) => {
        this.logger.error(
          `Failed to refresh Binance asset ${error.assetId}: ${error.reason}`,
        );
      },
    );
  }

  async syncReferenceRates(symbols: string[]) {
    const normalizedSymbols = Array.from(
      new Set(symbols.map((symbol) => symbol.toUpperCase())),
    ).filter(
      (symbol) => symbol !== 'UAH' && symbol !== 'USD' && symbol !== 'USDT',
    );

    for (const symbol of normalizedSymbols) {
      await this.tryUpdateCurrencyRate(symbol);
    }

    return {
      success: true,
      count: normalizedSymbols.length,
    };
  }

  private async getAccountInfo(apiKey: string, apiSecret: string) {
    try {
      return await this.requestAccountInfo(apiKey, apiSecret, 2000);
    } catch (error) {
      const errorMessage = this.extractBinanceErrorMessage(error);

      if (errorMessage.includes('Timestamp for this request')) {
        try {
          return await this.requestAccountInfo(apiKey, apiSecret, 5000);
        } catch (retryError) {
          const retryMessage = this.extractBinanceErrorMessage(retryError);
          throw new BadGatewayException(retryMessage);
        }
      }

      try {
        return await this.requestAccountInfo(apiKey, apiSecret, 5000);
      } catch (retryError) {
        const retryMessage = this.extractBinanceErrorMessage(retryError);
        throw new BadGatewayException(retryMessage || errorMessage);
      }
    }
  }

  private async getServerTimestamp() {
    try {
      const response = await firstValueFrom(
        this.httpService.get<BinanceServerTimeResponse>(
          `${this.baseUrl}/api/v3/time`,
        ),
      );

      return response.data.serverTime;
    } catch {
      return Date.now();
    }
  }

  private async requestAccountInfo(
    apiKey: string,
    apiSecret: string,
    safetyOffsetMs: number,
  ) {
    const serverTimestamp = await this.getServerTimestamp();
    const params = new URLSearchParams({
      omitZeroBalances: 'true',
      recvWindow: '10000',
      timestamp: Math.max(serverTimestamp - safetyOffsetMs, 0).toString(),
    });

    const signature = createHmac('sha256', apiSecret)
      .update(params.toString())
      .digest('hex');

    params.append('signature', signature);

    const response = await firstValueFrom(
      this.httpService.get<BinanceAccountResponse>(
        `${this.baseUrl}/api/v3/account?${params.toString()}`,
        {
          headers: {
            'X-MBX-APIKEY': apiKey,
          },
        },
      ),
    );

    return response.data;
  }

  private async tryUpdateCurrencyRate(currency: string) {
    const normalizedCurrency = currency.toUpperCase();

    if (normalizedCurrency === 'UAH' || normalizedCurrency === 'USDT') {
      return;
    }

    const directPairRate = await this.getTickerPrice(
      `${normalizedCurrency}UAH`,
    );

    if (directPairRate) {
      await this.currencyRatesService.upsertRate(
        normalizedCurrency,
        directPairRate,
        RateSource.BINANCE,
      );
      return;
    }

    const usdtPairRate = await this.getTickerPrice(`${normalizedCurrency}USDT`);
    const usdRate = await this.currencyRatesService.getRate('USD');

    if (usdtPairRate && usdRate) {
      await this.currencyRatesService.upsertRate(
        normalizedCurrency,
        usdtPairRate * usdRate,
        RateSource.BINANCE,
      );
    }
  }

  private async getTickerPrice(symbol: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<BinanceTickerPriceResponse>(
          `${this.baseUrl}/api/v3/ticker/price`,
          {
            params: { symbol },
          },
        ),
      );

      return Number(response.data.price);
    } catch {
      return null;
    }
  }

  private extractBinanceErrorMessage(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response
    ) {
      const data = error.response.data;

      if (
        typeof data === 'object' &&
        data !== null &&
        'msg' in data &&
        typeof data.msg === 'string'
      ) {
        return `Binance API error: ${data.msg}`;
      }
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'status' in error.response &&
      typeof error.response.status === 'number'
    ) {
      return `Failed to fetch Binance account data (HTTP ${error.response.status})`;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.length > 0
    ) {
      return `Failed to fetch Binance account data: ${error.message}`;
    }

    return 'Failed to fetch Binance account data';
  }
}
