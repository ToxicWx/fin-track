import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from '../aggregator/binance/binance.service';
import { BlockscanService } from '../aggregator/blockscan/blockscan.service';
import { MonobankService } from '../aggregator/monobank/monobank.service';
import { NbuService } from '../aggregator/nbu/nbu.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly nbuService: NbuService,
    private readonly binanceService: BinanceService,
    private readonly blockscanService: BlockscanService,
    private readonly monobankService: MonobankService,
  ) {}

  async onModuleInit() {
    await this.runJob('initial NBU rates sync', async () => {
      const result = await this.nbuService.syncRates();
      this.logger.log(
        `Initial NBU rates sync finished. Count: ${result.count}`,
      );
    });

    await this.runJob('initial Binance reference rates sync', async () => {
      const result = await this.binanceService.syncReferenceRates([
        'BTC',
        'ETH',
        'SOL',
      ]);
      this.logger.log(
        `Initial Binance reference rates sync finished. Count: ${result.count}`,
      );
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncNbuRates() {
    await this.runJob('sync NBU rates', async () => {
      const result = await this.nbuService.syncRates();
      this.logger.log(`NBU rates synced successfully. Count: ${result.count}`);
    });

    await this.runJob('sync Binance reference rates', async () => {
      const result = await this.binanceService.syncReferenceRates([
        'BTC',
        'ETH',
        'SOL',
      ]);
      this.logger.log(
        `Binance reference rates synced successfully. Count: ${result.count}`,
      );
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncBinanceAssets() {
    await this.runJob('refresh Binance assets', async () => {
      const result = await this.binanceService.refreshAutoAssets();
      this.logger.log(
        `Binance assets refresh finished. Total: ${result.total}, refreshed: ${result.refreshed}, failed: ${result.failed}`,
      );
      if (result.errors.length > 0) {
        this.logger.warn(
          `Binance refresh errors: ${JSON.stringify(result.errors)}`,
        );
      }
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncBlockscanAssets() {
    await this.runJob('refresh Blockscan assets', async () => {
      const result = await this.blockscanService.refreshAutoAssets();
      this.logger.log(
        `Blockscan assets refresh finished. Total: ${result.total}, refreshed: ${result.refreshed}, failed: ${result.failed}`,
      );
    });
  }

  @Cron('0 */10 * * * *')
  async syncMonobankAssets() {
    await this.runJob('refresh Monobank assets', async () => {
      const result = await this.monobankService.refreshAutoAssets();
      this.logger.log(
        `Monobank assets refresh finished. Total: ${result.total}, refreshed: ${result.refreshed}, failed: ${result.failed}`,
      );
    });
  }

  private async runJob(action: string, job: () => Promise<void>) {
    try {
      await job();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';
      this.logger.error(`Failed to ${action}: ${message}`);
    }
  }
}
