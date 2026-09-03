import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ExtractionService, type ExtractionRepository } from './extraction.service.js';
import type { DocumentExtraction } from './extraction.js';
import type { ExtractionQueue } from './queue.contract.js';

const extraction: DocumentExtraction = {
  id: 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757',
  documentId: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
  status: 'PENDING',
  provider: 'mock',
  model: null,
  result: null,
  error: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
};

describe('ExtractionService', () => {
  it('creates a pending extraction and enqueues its job', async () => {
    let queuedExtractionId = '';
    const repository: ExtractionRepository = {
      createPending: async () => extraction,
      findByDocumentId: async () => extraction,
    };
    const queue = {
      enqueueExtraction: async (extractionId: string) => {
        queuedExtractionId = extractionId;
      },
    } satisfies ExtractionQueue;
    const service = new ExtractionService(repository, queue);

    await expect(service.schedule(extraction.documentId)).resolves.toEqual(extraction);
    expect(queuedExtractionId).toBe(extraction.id);
  });

  it('returns a stored extraction and rejects a missing one', async () => {
    const foundRepository: ExtractionRepository = {
      createPending: async () => extraction,
      findByDocumentId: async () => extraction,
    };
    const missingRepository: ExtractionRepository = {
      createPending: async () => extraction,
      findByDocumentId: async () => null,
    };
    const queue = { enqueueExtraction: async () => undefined } satisfies ExtractionQueue;

    await expect(
      new ExtractionService(foundRepository, queue).findByDocumentId(extraction.documentId),
    ).resolves.toEqual(extraction);
    await expect(
      new ExtractionService(missingRepository, queue).findByDocumentId(extraction.documentId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
