import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CredentialProvider } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AesService } from '../../common/crypto/aes.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BinanceService } from '../aggregator/binance/binance.service';
import { BlockscanService } from '../aggregator/blockscan/blockscan.service';
import { MonobankService } from '../aggregator/monobank/monobank.service';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  let service: AssetsService;
  let prismaService: {
    asset: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let aesService: {
    encrypt: jest.Mock;
  };
  let binanceService: {
    refreshAsset: jest.Mock;
  };
  let blockscanService: {
    refreshAsset: jest.Mock;
  };
  let monobankService: {
    refreshAsset: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      asset: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    aesService = {
      encrypt: jest.fn(),
    };

    binanceService = {
      refreshAsset: jest.fn(),
    };

    blockscanService = {
      refreshAsset: jest.fn(),
    };

    monobankService = {
      refreshAsset: jest.fn(),
    };

    service = new AssetsService(
      prismaService as unknown as PrismaService,
      aesService as unknown as AesService,
      binanceService as unknown as BinanceService,
      blockscanService as unknown as BlockscanService,
      monobankService as unknown as MonobankService,
    );
  });

  it('creates a manual asset without credentials', async () => {
    prismaService.asset.create.mockResolvedValue({
      id: 'asset-1',
      type: 'CASH',
      name: 'Cash reserve',
      balance: { toString: () => '1000.25' },
      currency: 'UAH',
      isAuto: false,
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      credential: null,
    });

    const result = await service.create('user-1', {
      type: 'CASH',
      name: 'Cash reserve',
      balance: 1000.25,
      currency: 'UAH',
      isAuto: false,
    });

    expect(aesService.encrypt).not.toHaveBeenCalled();
    expect(prismaService.asset.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'CASH',
        name: 'Cash reserve',
        balance: 1000.25,
        currency: 'UAH',
        isAuto: false,
        credential: undefined,
      },
      include: {
        credential: {
          select: {
            provider: true,
            externalIdentifier: true,
            tokenDecimals: true,
            encryptedSecret: true,
          },
        },
      },
    });
    expect(result).toEqual({
      id: 'asset-1',
      type: 'CASH',
      name: 'Cash reserve',
      balance: 1000.25,
      currency: 'UAH',
      isAuto: false,
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      credential: null,
    });
  });

  it('creates a Binance asset with encrypted credentials', async () => {
    aesService.encrypt
      .mockReturnValueOnce({
        encryptedValue: 'encrypted-key',
        iv: 'key-iv',
      })
      .mockReturnValueOnce({
        encryptedValue: 'encrypted-secret',
        iv: 'secret-iv',
      });

    prismaService.asset.create.mockResolvedValue({
      id: 'asset-2',
      type: 'CRYPTO',
      name: 'Binance BTC',
      balance: { toString: () => '0.5' },
      currency: 'BTC',
      isAuto: true,
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      credential: {
        provider: CredentialProvider.BINANCE,
        externalIdentifier: null,
        tokenDecimals: null,
        encryptedSecret: 'encrypted-secret',
      },
    });

    const result = await service.create('user-1', {
      type: 'CRYPTO',
      name: 'Binance BTC',
      balance: 0,
      currency: 'BTC',
      isAuto: true,
      credential: {
        provider: CredentialProvider.BINANCE,
        apiKey: 'api-key',
        apiSecret: 'api-secret',
      },
    });

    expect(aesService.encrypt).toHaveBeenNthCalledWith(1, 'api-key');
    expect(aesService.encrypt).toHaveBeenNthCalledWith(2, 'api-secret');
    expect(prismaService.asset.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'CRYPTO',
        name: 'Binance BTC',
        balance: 0,
        currency: 'BTC',
        isAuto: true,
        credential: {
          create: {
            provider: CredentialProvider.BINANCE,
            encryptedKey: 'encrypted-key',
            keyIv: 'key-iv',
            encryptedSecret: 'encrypted-secret',
            secretIv: 'secret-iv',
            externalIdentifier: undefined,
            tokenDecimals: undefined,
          },
        },
      },
      include: {
        credential: {
          select: {
            provider: true,
            externalIdentifier: true,
            tokenDecimals: true,
            encryptedSecret: true,
          },
        },
      },
    });
    expect(result.credential).toEqual({
      provider: CredentialProvider.BINANCE,
      externalIdentifier: null,
      tokenDecimals: null,
      hasStoredKey: true,
      hasStoredSecret: true,
    });
  });

  it('rejects Binance credentials without apiSecret', async () => {
    await expect(
      service.create('user-1', {
        type: 'CRYPTO',
        name: 'Broken Binance asset',
        balance: 0,
        currency: 'BTC',
        isAuto: true,
        credential: {
          provider: CredentialProvider.BINANCE,
          apiKey: 'api-key',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaService.asset.create).not.toHaveBeenCalled();
  });

  it('refreshes a Blockscan asset through the matching integration service', async () => {
    prismaService.asset.findFirst.mockResolvedValue({
      id: 'asset-3',
      userId: 'user-1',
      credential: {
        provider: CredentialProvider.BLOCKSCAN,
      },
    });

    blockscanService.refreshAsset.mockResolvedValue({
      id: 'asset-3',
      balance: 2,
    });

    const result = await service.refresh('user-1', 'asset-3');

    expect(blockscanService.refreshAsset).toHaveBeenCalledWith('asset-3');
    expect(binanceService.refreshAsset).not.toHaveBeenCalled();
    expect(monobankService.refreshAsset).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'asset-3',
      balance: 2,
    });
  });

  it('returns a refresh summary for auto assets only', async () => {
    prismaService.asset.findMany.mockResolvedValue([
      { id: 'asset-1', isAuto: true },
      { id: 'asset-2', isAuto: false },
      { id: 'asset-3', isAuto: true },
    ]);

    jest
      .spyOn(service, 'refresh')
      .mockImplementation(async (_userId: string, assetId: string) => {
        if (assetId === 'asset-3') {
          throw new Error('Sync failed');
        }

        return {
          id: assetId,
          userId: 'user-1',
          type: 'CASH',
          name: `Asset ${assetId}`,
          balance: new Decimal(100),
          currency: 'UAH',
          isAuto: true,
          updatedAt: new Date('2026-05-01T10:00:00.000Z'),
          credential: null,
        };
      });

    const result = await service.refreshAll('user-1');

    expect(service.refresh).toHaveBeenCalledTimes(2);
    expect(service.refresh).toHaveBeenNthCalledWith(1, 'user-1', 'asset-1');
    expect(service.refresh).toHaveBeenNthCalledWith(2, 'user-1', 'asset-3');
    expect(result).toEqual({
      total: 2,
      refreshed: 1,
      failed: 1,
      errors: [
        {
          assetId: 'asset-3',
          reason: 'Sync failed',
        },
      ],
    });
  });

  it('throws NotFoundException when removing a missing or foreign asset', async () => {
    prismaService.asset.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-1', 'asset-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prismaService.asset.delete).not.toHaveBeenCalled();
  });
});
