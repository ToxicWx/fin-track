import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { RateSource } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { CurrencyRatesService } from '../../../common/currency-rates/currency-rates.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NbuRateApiItem } from './nbu.types';

@Injectable()
export class NbuService {
  private readonly nbuEndpoint =
    'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly currencyRatesService: CurrencyRatesService,
  ) {}

  async syncRates() {
    const response = await firstValueFrom(
      this.httpService.get<NbuRateApiItem[]>(this.nbuEndpoint),
    );

    const rates = response.data ?? [];

    await Promise.all(
      rates.map((rate) =>
        this.currencyRatesService.upsertRate(
          rate.cc,
          rate.rate,
          RateSource.NBU,
        ),
      ),
    );

    await this.currencyRatesService.upsertRate('UAH', 1, RateSource.NBU);

    return {
      success: true,
      count: rates.length + 1,
      source: RateSource.NBU,
    };
  }

  async getRates() {
    return this.prisma.currencyRate.findMany({
      orderBy: { code: 'asc' },
    });
  }
}
