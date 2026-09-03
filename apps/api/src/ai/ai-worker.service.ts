import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { ExtractionProcessor } from './extraction-processor.js';

const RATE_CONFIRMATION_EXTRACTION_QUEUE = 'rate-confirmation-extraction';

interface ExtractionJobData {
  extractionId: string;
}

@Injectable()
export class AiWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(AiWorkerService.name);
  private worker: Worker<ExtractionJobData> | null = null;
  private readonly connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
    maxRetriesPerRequest: null,
  });

  constructor(@Inject(ExtractionProcessor) private readonly processor: ExtractionProcessor) {}

  async start(): Promise<void> {
    if (this.worker !== null) {
      return;
    }

    this.worker = new Worker<ExtractionJobData>(
      RATE_CONFIRMATION_EXTRACTION_QUEUE,
      async (job) => this.processor.process(job.data.extractionId),
      { connection: this.connection },
    );
    await this.worker.waitUntilReady();
    this.logger.log('AI extraction worker is ready.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
