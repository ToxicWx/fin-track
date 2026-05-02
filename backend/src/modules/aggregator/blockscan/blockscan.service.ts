import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialProvider, RateSource } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { AesService } from '../../../common/crypto/aes.service';
import { CurrencyRatesService } from '../../../common/currency-rates/currency-rates.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { buildRefreshSummary } from '../../../common/utils/refresh-summary';
import { BlockscanBalanceResponse } from './blockscan.types';

@Injectable()
export class BlockscanService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly chainId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly aesService: AesService,
    private readonly currencyRatesService: CurrencyRatesService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('BLOCKSCAN_API_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'BLOCKSCAN_BASE_URL',
      'https://api.etherscan.io/v2/api',
    );
    this.chainId = this.configService.get<string>('BLOCKSCAN_CHAIN_ID', '1');
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

    if (asset.credential?.provider !== CredentialProvider.BLOCKSCAN) {
      throw new BadRequestException('Asset is not configured for Blockscan');
    }

    if (!this.apiKey) {
      throw new BadRequestException(
        'BLOCKSCAN_API_KEY is not configured in the environment',
      );
    }

    const walletAddress = this.aesService.decrypt(
      asset.credential.encryptedKey,
      asset.credential.keyIv,
    );

    const rawBalance = asset.credential.externalIdentifier
      ? await this.getTokenBalance(
          walletAddress,
          asset.credential.externalIdentifier,
        )
      : await this.getNativeBalance(walletAddress);

    const decimals = asset.credential.externalIdentifier
      ? (asset.credential.tokenDecimals ?? 0)
      : 18;

    const balance = this.normalizeBalance(rawBalance, decimals);

    await this.tryUpdateCurrencyRate(asset.currency);

    return this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        balance,
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
          provider: CredentialProvider.BLOCKSCAN,
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
      'Unknown Blockscan refresh error',
    );
  }

  private async getNativeBalance(address: string) {
    const response = await firstValueFrom(
      this.httpService.get<BlockscanBalanceResponse>(this.baseUrl, {
        params: {
          chainid: this.chainId,
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: this.apiKey,
        },
      }),
    );

    return this.extractResult(response.data);
  }

  private async getTokenBalance(address: string, contractAddress: string) {
    const response = await firstValueFrom(
      this.httpService.get<BlockscanBalanceResponse>(this.baseUrl, {
        params: {
          chainid: this.chainId,
          module: 'account',
          action: 'tokenbalance',
          contractaddress: contractAddress,
          address,
          tag: 'latest',
          apikey: this.apiKey,
        },
      }),
    );

    return this.extractResult(response.data);
  }

  private extractResult(data: BlockscanBalanceResponse) {
    if (data.status !== '1') {
      throw new BadGatewayException(
        `Blockscan API error: ${data.message || 'Unknown error'}`,
      );
    }

    return data.result;
  }

  private normalizeBalance(rawBalance: string, decimals: number) {
    const divisor = Math.pow(10, decimals);
    return Number(rawBalance) / divisor;
  }

  private async tryUpdateCurrencyRate(currency: string) {
    const normalizedCurrency = currency.toUpperCase();

    if (normalizedCurrency === 'ETH') {
      const ethUsdtRate = await this.getBinanceTickerPrice('ETHUSDT');
      const usdRate = await this.currencyRatesService.getRate('USD');

      if (ethUsdtRate && usdRate) {
        await this.currencyRatesService.upsertRate(
          'ETH',
          ethUsdtRate * usdRate,
          RateSource.BINANCE,
        );
      }
      return;
    }

    if (normalizedCurrency === 'USDT' || normalizedCurrency === 'USDC') {
      const usdRate = await this.currencyRatesService.getRate('USD');

      if (usdRate) {
        await this.currencyRatesService.upsertRate(
          normalizedCurrency,
          usdRate,
          RateSource.NBU,
        );
      }
    }
  }

  private async getBinanceTickerPrice(symbol: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ price: string }>(
          'https://api.binance.com/api/v3/ticker/price',
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
}
