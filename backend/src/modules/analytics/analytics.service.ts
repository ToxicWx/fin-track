import { Injectable } from '@nestjs/common';
import { AssetType, TransactionType } from '@prisma/client';
import { CurrencyRatesService } from '../../common/currency-rates/currency-rates.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyRatesService: CurrencyRatesService,
  ) {}

  async getNetWorth(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const ratesMap = await this.currencyRatesService.getRatesMap(
      assets.map((asset) => asset.currency),
    );

    const items = assets.map((asset) => {
      const rateToUah = this.currencyRatesService.resolveRate(
        asset.currency,
        ratesMap,
      );
      const balance = Number(asset.balance);
      const valueUah = balance * rateToUah;

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        currency: asset.currency,
        balance,
        rateToUah,
        valueUah: this.round(valueUah),
        updatedAt: asset.updatedAt,
      };
    });

    const totalUah = this.round(
      items.reduce((sum, item) => sum + item.valueUah, 0),
    );

    return {
      currency: 'UAH',
      totalUah,
      items,
    };
  }

  async getDistribution(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
    });

    const ratesMap = await this.currencyRatesService.getRatesMap(
      assets.map((asset) => asset.currency),
    );

    const byType = new Map<
      AssetType,
      { type: AssetType; valueUah: number; percentage: number }
    >();

    for (const asset of assets) {
      const rateToUah = this.currencyRatesService.resolveRate(
        asset.currency,
        ratesMap,
      );
      const valueUah = Number(asset.balance) * rateToUah;

      const existing = byType.get(asset.type) ?? {
        type: asset.type,
        valueUah: 0,
        percentage: 0,
      };

      existing.valueUah += valueUah;
      byType.set(asset.type, existing);
    }

    const distribution = Array.from(byType.values()).map((item) => ({
      ...item,
      valueUah: this.round(item.valueUah),
    }));

    const totalUah = this.round(
      distribution.reduce((sum, item) => sum + item.valueUah, 0),
    );

    return distribution
      .map((item) => ({
        ...item,
        percentage:
          totalUah === 0 ? 0 : this.round((item.valueUah / totalUah) * 100),
      }))
      .sort((a, b) => b.valueUah - a.valueUah);
  }

  async getHistory(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        asset: {
          userId,
        },
      },
      include: {
        asset: {
          select: {
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) {
      return [];
    }

    const ratesMap = await this.currencyRatesService.getRatesMap(
      transactions.map((transaction) => transaction.asset.currency),
    );

    const dailyMap = new Map<string, number>();

    for (const transaction of transactions) {
      const date = transaction.createdAt.toISOString().slice(0, 10);
      const rateToUah = this.currencyRatesService.resolveRate(
        transaction.asset.currency,
        ratesMap,
      );
      const signedAmount = transaction.type === TransactionType.INCOME ? 1 : -1;
      const valueUah = Number(transaction.amount) * rateToUah * signedAmount;

      dailyMap.set(date, (dailyMap.get(date) ?? 0) + valueUah);
    }

    let cumulativeUah = 0;

    return Array.from(dailyMap.entries()).map(([date, dayDeltaUah]) => {
      cumulativeUah += dayDeltaUah;

      return {
        date,
        deltaUah: this.round(dayDeltaUah),
        totalUah: this.round(cumulativeUah),
      };
    });
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }
}
