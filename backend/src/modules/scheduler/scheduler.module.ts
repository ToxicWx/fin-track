import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregatorModule } from '../aggregator/aggregator.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), AggregatorModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
