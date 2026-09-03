import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { AiQueueService } from './ai-queue.service.js';

describe('AiQueueService', () => {
  let service: AiQueueService;

  afterEach(async () => {
    await service?.onModuleDestroy();
  });

  it('connects to Redis and enqueues an extraction job', async () => {
    service = new AiQueueService();
    await service.onModuleInit();

    await expect(service.enqueueExtraction(randomUUID())).resolves.toBeUndefined();
  });
});
