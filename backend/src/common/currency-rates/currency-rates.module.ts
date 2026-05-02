import { Global, Module } from '@nestjs/common';
import { CurrencyRatesService } from './currency-rates.service';

@Global()
@Module({
  providers: [CurrencyRatesService],
  exports: [CurrencyRatesService],
})
export class CurrencyRatesModule {}
