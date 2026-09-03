import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AI_EXTRACTION_QUEUE, type ExtractionQueue } from './queue.contract.js';
import type { DocumentExtraction } from './extraction.js';

export interface ExtractionRepository {
  createPending(documentId: string, provider: string): Promise<DocumentExtraction>;
  findByDocumentId(documentId: string): Promise<DocumentExtraction | null>;
}

export const EXTRACTION_REPOSITORY = Symbol('EXTRACTION_REPOSITORY');

@Injectable()
export class ExtractionService {
  constructor(
    @Inject(EXTRACTION_REPOSITORY) private readonly extractionRepository: ExtractionRepository,
    @Inject(AI_EXTRACTION_QUEUE) private readonly queue: ExtractionQueue,
  ) {}

  async schedule(documentId: string): Promise<DocumentExtraction> {
    const extraction = await this.extractionRepository.createPending(documentId, this.provider);
    await this.queue.enqueueExtraction(extraction.id);

    return extraction;
  }

  async findByDocumentId(documentId: string): Promise<DocumentExtraction> {
    const extraction = await this.extractionRepository.findByDocumentId(documentId);

    if (extraction === null) {
      throw new NotFoundException({ code: 'EXTRACTION_NOT_FOUND' });
    }

    return extraction;
  }

  private get provider(): string {
    return process.env.AI_PROVIDER ?? 'mock';
  }
}
