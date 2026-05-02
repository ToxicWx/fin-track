import { Injectable } from '@nestjs/common';
import { RateSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrencyRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRatesMap(currencies: string[]) {
    const uniqueCurrencies = Array.from(
      new Set(currencies.map((currency) => currency.toUpperCase())),
    ).filter((currency) => currency !== 'UAH');

    if (uniqueCurrencies.length === 0) {
      return new Map<string, number>();
    }

    const rates = await this.prisma.currencyRate.findMany({
      where: {
        code: {
          in: uniqueCurrencies,
        },
      },
    });

    return new Map(
      rates.map((rate) => [rate.code.toUpperCase(), Number(rate.rateToUah)]),
    );
  }

  resolveRate(currency: string, ratesMap: Map<string, number>) {
    const normalizedCurrency = currency.toUpperCase();

    if (normalizedCurrency === 'UAH') {
      return 1;
    }

    return ratesMap.get(normalizedCurrency) ?? 0;
  }

  async upsertRate(code: string, rateToUah: number, source: RateSource) {
    const normalizedCode = code.toUpperCase();

    await this.prisma.currencyRate.upsert({
      where: { code: normalizedCode },
      update: {
        rateToUah,
        source,
      },
      create: {
        code: normalizedCode,
        rateToUah,
        source,
      },
    });
  }

  async getRate(code: string) {
    const rate = await this.prisma.currencyRate.findUnique({
      where: { code: code.toUpperCase() },
    });

    return rate ? Number(rate.rateToUah) : null;
  }
}
