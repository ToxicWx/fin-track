import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

type EncryptedPayload = {
  encryptedValue: string;
  iv: string;
};

@Injectable()
export class AesService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.getOrThrow<string>('AES_SECRET');
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(value: string): EncryptedPayload {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encryptedValue = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]).toString('hex');

    return {
      encryptedValue,
      iv: iv.toString('hex'),
    };
  }

  decrypt(encryptedValue: string, iv: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
