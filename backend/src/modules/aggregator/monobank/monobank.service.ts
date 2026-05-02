import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialProvider, TransactionType } from '@prisma/client';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AesService } from '../../../common/crypto/aes.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { buildRefreshSummary } from '../../../common/utils/refresh-summary';
import {
  MonobankAccount,
  MonobankClientInfoResponse,
  MonobankStatementItem,
} from './monobank.types';

@Injectable()
export class MonobankService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly aesService: AesService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'MONOBANK_BASE_URL',
      'https://api.monobank.ua',
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

    if (asset.credential?.provider !== CredentialProvider.MONOBANK) {
      throw new BadRequestException('Asset is not configured for Monobank');
    }

    const token = this.aesService.decrypt(
      asset.credential.encryptedKey,
      asset.credential.keyIv,
    );

    const clientInfo = await this.getClientInfo(token);
    const account = this.resolveAccount(
      clientInfo.accounts,
      asset.currency,
      asset.credential.externalIdentifier,
    );

    if (!account) {
      throw new NotFoundException(
        'No matching Monobank account found for this asset',
      );
    }

    const statements = await this.getAllStatements(token, account.id);
    await this.syncTransactions(asset.id, statements);

    return this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        balance: this.fromMinorUnits(account.balance, account.currencyCode),
        isAuto: true,
      },
      include: {
        credential: {
          select: {
            provider: true,
            externalIdentifier: true,
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
          provider: CredentialProvider.MONOBANK,
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
      'Unknown Monobank refresh error',
    );
  }

  private async getClientInfo(token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<MonobankClientInfoResponse>(
          `${this.baseUrl}/personal/client-info`,
          {
            headers: {
              'X-Token': token,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new BadGatewayException(this.extractMonobankError(error));
    }
  }

  private async getAllStatements(token: string, accountId: string) {
    const from = Math.floor(Date.now() / 1000) - 2682000;
    let to = Math.floor(Date.now() / 1000);
    const allItems: MonobankStatementItem[] = [];

    while (true) {
      const response = await this.getStatementChunk(token, accountId, from, to);
      allItems.push(...response);

      if (response.length < 500) {
        break;
      }

      const lastItem = response[response.length - 1];
      to = lastItem.time - 1;
    }

    return allItems;
  }

  private async getStatementChunk(
    token: string,
    accountId: string,
    from: number,
    to: number,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<MonobankStatementItem[]>(
          `${this.baseUrl}/personal/statement/${accountId}/${from}/${to}`,
          {
            headers: {
              'X-Token': token,
            },
          },
        ),
      );

      return response.data ?? [];
    } catch (error) {
      throw new BadGatewayException(this.extractMonobankError(error));
    }
  }

  private resolveAccount(
    accounts: MonobankAccount[],
    assetCurrency: string,
    externalIdentifier?: string | null,
  ) {
    if (externalIdentifier) {
      return accounts.find((account) => account.id === externalIdentifier);
    }

    const targetCurrencyCode = this.currencyToNumericCode(assetCurrency);

    if (!targetCurrencyCode) {
      return accounts[0] ?? null;
    }

    return (
      accounts.find((account) => account.currencyCode === targetCurrencyCode) ??
      accounts[0] ??
      null
    );
  }

  private async syncTransactions(
    assetId: string,
    statements: MonobankStatementItem[],
  ) {
    await Promise.all(
      statements.map((item) =>
        this.prisma.transaction.upsert(
          this.buildTransactionUpsert(assetId, item),
        ),
      ),
    );
  }

  private buildTransactionUpsert(assetId: string, item: MonobankStatementItem) {
    const amount = this.fromMinorUnits(item.amount, item.currencyCode);
    const type =
      item.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
    const description =
      item.description || item.comment || 'Monobank transaction';
    const createdAt = new Date(item.time * 1000);

    return {
      where: { externalId: item.id },
      update: {
        amount,
        type,
        category: 'monobank',
        description,
        createdAt,
      },
      create: {
        assetId,
        externalId: item.id,
        amount,
        type,
        category: 'monobank',
        description,
        createdAt,
      },
    };
  }

  private currencyToNumericCode(currency: string) {
    const normalized = currency.toUpperCase();
    const map: Record<string, number> = {
      UAH: 980,
      USD: 840,
      EUR: 978,
    };

    return map[normalized] ?? null;
  }

  private fromMinorUnits(value: number, currencyCode: number) {
    const decimals = currencyCode === 392 ? 0 : 2;
    return Number((Math.abs(value) / Math.pow(10, decimals)).toFixed(2));
  }

  private extractMonobankError(error: unknown) {
    if (error instanceof AxiosError) {
      if (typeof error.response?.data === 'string') {
        return `Monobank API error: ${error.response.data}`;
      }

      if (
        typeof error.response?.data === 'object' &&
        error.response?.data !== null &&
        'errorDescription' in error.response.data
      ) {
        const data = error.response.data as { errorDescription?: string };
        return `Monobank API error: ${data.errorDescription ?? 'Unknown error'}`;
      }
    }

    return 'Failed to fetch Monobank data';
  }
}
