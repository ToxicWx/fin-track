import { Transform, Type } from 'class-transformer';
import { AssetType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateAssetCredentialDto } from './asset-credential.dto';

export class UpdateAssetDto {
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value).trim())
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  balance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Transform(({ value }) => String(value).trim().toUpperCase())
  currency?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAuto?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAssetCredentialDto)
  credential?: UpdateAssetCredentialDto;
}
