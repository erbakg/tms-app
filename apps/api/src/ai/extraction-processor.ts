import { Inject, Injectable } from '@nestjs/common';

import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage.js';
import type { DocumentExtraction } from './extraction.js';
import {
  RATE_CONFIRMATION_AI_PROVIDER,
  type RateConfirmationAiProvider,
  type RateConfirmationExtractionResult,
} from './rate-confirmation-ai.js';

export interface ExtractionDocument {
  id: string;
  filename: string;
  mimeType: string;
  storageKey: string;
}

export interface ExtractionProcessingRepository {
  findByIdWithDocument(
    extractionId: string,
  ): Promise<{ extraction: DocumentExtraction; document: ExtractionDocument } | null>;
  markProcessing(extractionId: string): Promise<void>;
  markCompleted(
    extractionId: string,
    model: string | null,
    result: RateConfirmationExtractionResult,
  ): Promise<void>;
  markFailed(extractionId: string, error: string): Promise<void>;
}

export const EXTRACTION_PROCESSING_REPOSITORY = Symbol('EXTRACTION_PROCESSING_REPOSITORY');

@Injectable()
export class ExtractionProcessor {
  constructor(
    @Inject(EXTRACTION_PROCESSING_REPOSITORY)
    private readonly extractionRepository: ExtractionProcessingRepository,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStorage,
    @Inject(RATE_CONFIRMATION_AI_PROVIDER)
    private readonly provider: RateConfirmationAiProvider,
  ) {}

  async process(extractionId: string): Promise<void> {
    const record = await this.extractionRepository.findByIdWithDocument(extractionId);

    if (record === null) {
      throw new Error(`Extraction ${extractionId} was not found.`);
    }

    await this.extractionRepository.markProcessing(record.extraction.id);

    try {
      const contents = await this.objectStorage.getObject(record.document.storageKey);
      const result = await this.provider.extract({
        contents,
        filename: record.document.filename,
        mimeType: record.document.mimeType,
      });
      await this.extractionRepository.markCompleted(
        record.extraction.id,
        this.provider.model,
        result,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extraction error.';
      await this.extractionRepository.markFailed(record.extraction.id, message.slice(0, 2_000));
      throw error;
    }
  }
}
