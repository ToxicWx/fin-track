import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialProvider } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AesService } from '../../common/crypto/aes.service';
import { BinanceService } from '../aggregator/binance/binance.service';
import { BlockscanService } from '../aggregator/blockscan/blockscan.service';
import { MonobankService } from '../aggregator/monobank/monobank.service';
import { buildRefreshSummary } from '../../common/utils/refresh-summary';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

const assetCredentialSelect = {
  provider: true,
  externalIdentifier: true,
  tokenDecimals: true,
  encryptedSecret: true,
} as const;

const assetWithViewInclude = {
  credential: {
    select: assetCredentialSelect,
  },
} as const;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aesService: AesService,
    private readonly binanceService: BinanceService,
    private readonly blockscanService: BlockscanService,
    private readonly monobankService: MonobankService,
  ) {}

  async findAllByUser(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: assetWithViewInclude,
    });

    return assets.map((asset) => this.toAssetView(asset));
  }

  async create(userId: string, dto: CreateAssetDto) {
    this.validateCredential(dto.credential);

    const credentialData = dto.credential
      ? this.aesService.encrypt(dto.credential.apiKey)
      : null;
    const secretData = dto.credential?.apiSecret
      ? this.aesService.encrypt(dto.credential.apiSecret)
      : null;

    const asset = await this.prisma.asset.create({
      data: {
        userId,
        type: dto.type,
        name: dto.name,
        balance: dto.balance,
        currency: dto.currency,
        isAuto: dto.isAuto,
        credential:
          dto.credential && credentialData
            ? {
                create: {
                  provider: dto.credential.provider,
                  encryptedKey: credentialData.encryptedValue,
                  keyIv: credentialData.iv,
                  encryptedSecret: secretData?.encryptedValue,
                  secretIv: secretData?.iv,
                  externalIdentifier: dto.credential.externalId,
                  tokenDecimals: dto.credential.tokenDecimals,
                },
              }
            : undefined,
      },
      include: assetWithViewInclude,
    });

    return this.toAssetView(asset);
  }

  async update(userId: string, assetId: string, dto: UpdateAssetDto) {
    const existingAsset = await this.findOwnedAssetWithCredential(
      userId,
      assetId,
    );

    this.validateCredential(dto.credential);

    const credentialMutation = dto.credential
      ? this.buildCredentialMutation(existingAsset.credential, dto)
      : undefined;

    const asset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        type: dto.type,
        name: dto.name,
        balance: dto.balance,
        currency: dto.currency,
        isAuto: dto.isAuto,
        credential: credentialMutation,
      },
      include: assetWithViewInclude,
    });

    return this.toAssetView(asset);
  }

  async refresh(userId: string, assetId: string) {
    const asset = await this.findOwnedAssetWithCredential(userId, assetId);

    switch (asset.credential?.provider) {
      case CredentialProvider.BINANCE:
        return this.binanceService.refreshAsset(asset.id);
      case CredentialProvider.BLOCKSCAN:
        return this.blockscanService.refreshAsset(asset.id);
      case CredentialProvider.MONOBANK:
        return this.monobankService.refreshAsset(asset.id);
      default:
        return this.prisma.asset.update({
          where: { id: assetId },
          data: {},
          include: assetWithViewInclude,
        });
    }
  }

  async remove(userId: string, assetId: string) {
    await this.ensureAssetOwnership(userId, assetId);

    await this.prisma.asset.delete({
      where: { id: assetId },
    });

    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  }

  async refreshAll(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      select: {
        id: true,
        isAuto: true,
      },
    });

    const refreshableAssets = assets.filter((asset) => asset.isAuto);
    const results = await Promise.allSettled(
      refreshableAssets.map((asset) => this.refresh(userId, asset.id)),
    );

    return buildRefreshSummary(
      refreshableAssets.map((asset) => asset.id),
      results,
      'Unknown refresh error',
    );
  }

  private async findOwnedAssetWithCredential(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        userId,
      },
      include: {
        credential: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private async ensureAssetOwnership(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        userId,
      },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
  }

  private validateCredential(dto?: {
    provider: CredentialProvider;
    apiKey?: string;
    apiSecret?: string;
    externalId?: string;
    tokenDecimals?: number;
    keepExistingKey?: boolean;
    keepExistingSecret?: boolean;
  }) {
    if (
      dto?.provider === CredentialProvider.BINANCE &&
      !dto.apiSecret &&
      !dto.keepExistingSecret
    ) {
      throw new BadRequestException(
        'Binance credentials require both apiKey and apiSecret',
      );
    }

    if (
      dto?.provider === CredentialProvider.BLOCKSCAN &&
      dto.externalId &&
      dto.tokenDecimals === undefined
    ) {
      throw new BadRequestException(
        'Blockscan token assets require tokenDecimals when externalId is provided',
      );
    }
  }

  private buildCredentialMutation(
    existingCredential: {
      provider: CredentialProvider;
      encryptedKey: string;
      keyIv: string;
      encryptedSecret: string | null;
      secretIv: string | null;
      externalIdentifier: string | null;
      tokenDecimals: number | null;
    } | null,
    dto: UpdateAssetDto,
  ) {
    if (!dto.credential) {
      return undefined;
    }

    const nextKey =
      dto.credential.apiKey && dto.credential.apiKey.trim().length > 0
        ? this.aesService.encrypt(dto.credential.apiKey)
        : null;
    const nextSecret =
      dto.credential.apiSecret && dto.credential.apiSecret.trim().length > 0
        ? this.aesService.encrypt(dto.credential.apiSecret)
        : null;

    const updateData = {
      provider: dto.credential.provider,
      encryptedKey:
        nextKey?.encryptedValue ??
        existingCredential?.encryptedKey ??
        undefined,
      keyIv: nextKey?.iv ?? existingCredential?.keyIv ?? undefined,
      encryptedSecret:
        nextSecret?.encryptedValue ??
        existingCredential?.encryptedSecret ??
        undefined,
      secretIv: nextSecret?.iv ?? existingCredential?.secretIv ?? undefined,
      externalIdentifier:
        dto.credential.externalId ??
        existingCredential?.externalIdentifier ??
        null,
      tokenDecimals:
        dto.credential.tokenDecimals ??
        existingCredential?.tokenDecimals ??
        null,
    };

    if (!updateData.encryptedKey || !updateData.keyIv) {
      throw new BadRequestException(
        'Credential update requires apiKey or an existing stored key',
      );
    }

    return {
      upsert: {
        update: updateData,
        create: {
          provider: dto.credential.provider,
          encryptedKey:
            nextKey?.encryptedValue ?? existingCredential?.encryptedKey ?? '',
          keyIv: nextKey?.iv ?? existingCredential?.keyIv ?? '',
          encryptedSecret:
            nextSecret?.encryptedValue ??
            existingCredential?.encryptedSecret ??
            undefined,
          secretIv: nextSecret?.iv ?? existingCredential?.secretIv ?? undefined,
          externalIdentifier: dto.credential.externalId,
          tokenDecimals: dto.credential.tokenDecimals,
        },
      },
    };
  }

  private toAssetView(
    asset: {
      balance: { toString(): string } | number;
      credential: {
        provider: CredentialProvider;
        externalIdentifier?: string | null;
        tokenDecimals?: number | null;
        encryptedSecret?: string | null;
      } | null;
    } & Record<string, unknown>,
  ) {
    return {
      ...asset,
      balance: Number(asset.balance),
      credential: asset.credential
        ? {
            provider: asset.credential.provider,
            externalIdentifier: asset.credential.externalIdentifier ?? null,
            tokenDecimals: asset.credential.tokenDecimals ?? null,
            hasStoredKey: true,
            hasStoredSecret: Boolean(asset.credential.encryptedSecret),
          }
        : null,
    };
  }
}
