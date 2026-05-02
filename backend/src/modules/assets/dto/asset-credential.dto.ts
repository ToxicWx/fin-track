import { CredentialProvider } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AssetCredentialDto {
  @IsEnum(CredentialProvider)
  provider!: CredentialProvider;

  @IsString()
  @MinLength(4)
  @MaxLength(2048)
  apiKey!: string;

  @ValidateIf(
    (o: AssetCredentialDto) => o.provider === CredentialProvider.BINANCE,
  )
  @IsString()
  @MinLength(4)
  @MaxLength(2048)
  apiSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  externalId?: string;

  @ValidateIf(
    (o: AssetCredentialDto) =>
      o.provider === CredentialProvider.BLOCKSCAN && Boolean(o.externalId),
  )
  @IsInt()
  @Min(0)
  tokenDecimals?: number;
}

export class UpdateAssetCredentialDto {
  @IsEnum(CredentialProvider)
  provider!: CredentialProvider;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(2048)
  apiKey?: string;

  @IsOptional()
  @ValidateIf(
    (o: UpdateAssetCredentialDto) =>
      o.provider === CredentialProvider.BINANCE && !o.keepExistingSecret,
  )
  @IsString()
  @MinLength(4)
  @MaxLength(2048)
  apiSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  externalId?: string;

  @ValidateIf(
    (o: UpdateAssetCredentialDto) =>
      o.provider === CredentialProvider.BLOCKSCAN && Boolean(o.externalId),
  )
  @IsOptional()
  @IsInt()
  @Min(0)
  tokenDecimals?: number;

  @IsOptional()
  @IsBoolean()
  keepExistingKey?: boolean;

  @IsOptional()
  @IsBoolean()
  keepExistingSecret?: boolean;
}
