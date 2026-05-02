import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NbuService } from './nbu.service';

@UseGuards(JwtAuthGuard)
@Controller('aggregator/nbu')
export class NbuController {
  constructor(private readonly nbuService: NbuService) {}

  @Post('sync')
  syncRates() {
    return this.nbuService.syncRates();
  }

  @Get('rates')
  getRates() {
    return this.nbuService.getRates();
  }
}
