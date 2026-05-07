import { AssetType, TransactionType } from '@prisma/client';
import { CurrencyRatesService } from '../../common/currency-rates/currency-rates.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: {
    asset: {
      findMany: jest.Mock;
    };
    transaction: {
      findMany: jest.Mock;
    };
  };
  let currencyRatesService: {
    getRatesMap: jest.Mock;
    resolveRate: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      asset: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
      },
    };

    currencyRatesService = {
      getRatesMap: jest.fn(),
      resolveRate: jest.fn((currency: string, ratesMap: Map<string, number>) =>
        currency.toUpperCase() === 'UAH'
          ? 1
          : (ratesMap.get(currency.toUpperCase()) ?? 0),
      ),
    };

    service = new AnalyticsService(
      prismaService as unknown as PrismaService,
      currencyRatesService as unknown as CurrencyRatesService,
    );
  });

  it('calculates net worth in UAH using currency rates', async () => {
    prismaService.asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        name: 'Cash',
        type: AssetType.CASH,
        currency: 'UAH',
        balance: { toString: () => '1000' },
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      },
      {
        id: 'asset-2',
        name: 'US savings',
        type: AssetType.BANK_ACCOUNT,
        currency: 'USD',
        balance: { toString: () => '100' },
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      },
    ]);

    currencyRatesService.getRatesMap.mockResolvedValue(
      new Map([['USD', 41.5]]),
    );

    const result = await service.getNetWorth('user-1');

    expect(result).toEqual({
      currency: 'UAH',
      totalUah: 5150,
      items: [
        {
          id: 'asset-1',
          name: 'Cash',
          type: AssetType.CASH,
          currency: 'UAH',
          balance: 1000,
          rateToUah: 1,
          valueUah: 1000,
          updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        },
        {
          id: 'asset-2',
          name: 'US savings',
          type: AssetType.BANK_ACCOUNT,
          currency: 'USD',
          balance: 100,
          rateToUah: 41.5,
          valueUah: 4150,
          updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      ],
    });
  });

  it('groups assets by type and calculates distribution percentages', async () => {
    prismaService.asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        type: AssetType.CASH,
        currency: 'UAH',
        balance: { toString: () => '1000' },
      },
      {
        id: 'asset-2',
        type: AssetType.CASH,
        currency: 'USD',
        balance: { toString: () => '100' },
      },
      {
        id: 'asset-3',
        type: AssetType.REAL_ESTATE,
        currency: 'UAH',
        balance: { toString: () => '2000' },
      },
    ]);

    currencyRatesService.getRatesMap.mockResolvedValue(
      new Map([['USD', 40]]),
    );

    const result = await service.getDistribution('user-1');

    expect(result).toEqual([
      {
        type: AssetType.CASH,
        valueUah: 5000,
        percentage: 71.43,
      },
      {
        type: AssetType.REAL_ESTATE,
        valueUah: 2000,
        percentage: 28.57,
      },
    ]);
  });

  it('builds cumulative history from income and expense transactions', async () => {
    prismaService.transaction.findMany.mockResolvedValue([
      {
        amount: { toString: () => '100' },
        type: TransactionType.INCOME,
        createdAt: new Date('2026-05-01T09:00:00.000Z'),
        asset: {
          currency: 'USD',
        },
      },
      {
        amount: { toString: () => '20' },
        type: TransactionType.EXPENSE,
        createdAt: new Date('2026-05-01T18:00:00.000Z'),
        asset: {
          currency: 'USD',
        },
      },
      {
        amount: { toString: () => '50' },
        type: TransactionType.INCOME,
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        asset: {
          currency: 'UAH',
        },
      },
    ]);

    currencyRatesService.getRatesMap.mockResolvedValue(
      new Map([['USD', 40]]),
    );

    const result = await service.getHistory('user-1');

    expect(result).toEqual([
      {
        date: '2026-05-01',
        deltaUah: 3200,
        totalUah: 3200,
      },
      {
        date: '2026-05-02',
        deltaUah: 50,
        totalUah: 3250,
      },
    ]);
  });

  it('returns an empty history when no transactions are found', async () => {
    prismaService.transaction.findMany.mockResolvedValue([]);

    const result = await service.getHistory('user-1');

    expect(currencyRatesService.getRatesMap).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
