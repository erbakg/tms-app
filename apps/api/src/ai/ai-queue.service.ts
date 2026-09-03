import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { ExtractionQueue } from './queue.contract.js';

const RATE_CONFIRMATION_EXTRACTION_QUEUE = 'rate-confirmation-extraction';

@Injectable()
export class AiQueueService implements ExtractionQueue, OnModuleInit, OnModuleDestroy {
  private readonly connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
    maxRetriesPerRequest: null,
  });
  private readonly queue = new Queue(RATE_CONFIRMATION_EXTRACTION_QUEUE, {
    connection: this.connection,
  });

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady();
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }

  enqueueExtraction(extractionId: string): Promise<void> {
    return this.queue
      .add('extract-rate-confirmation', { extractionId }, { jobId: extractionId, attempts: 3 })
      .then(() => undefined);
  }
}
