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
import { AssetCredentialDto } from './asset-credential.dto';

export class CreateAssetDto {
  @IsEnum(AssetType)
  type!: AssetType;

  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value).trim())
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  balance!: number;

  @IsString()
  @MaxLength(16)
  @Transform(({ value }) => String(value).trim().toUpperCase())
  currency!: string;

  @Type(() => Boolean)
  @IsBoolean()
  isAuto!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetCredentialDto)
  credential?: AssetCredentialDto;
}
