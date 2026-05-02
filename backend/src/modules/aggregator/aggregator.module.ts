import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BinanceService } from './binance/binance.service';
import { BlockscanService } from './blockscan/blockscan.service';
import { MonobankService } from './monobank/monobank.service';
import { NbuController } from './nbu/nbu.controller';
import { NbuService } from './nbu/nbu.service';

@Module({
  imports: [HttpModule],
  controllers: [NbuController],
  providers: [NbuService, BinanceService, BlockscanService, MonobankService],
  exports: [NbuService, BinanceService, BlockscanService, MonobankService],
})
export class AggregatorModule {}
