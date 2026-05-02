import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('net-worth')
  getNetWorth(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getNetWorth(user.id);
  }

  @Get('distribution')
  getDistribution(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getDistribution(user.id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getHistory(user.id);
  }
}
