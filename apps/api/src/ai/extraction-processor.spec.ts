import { describe, expect, it } from 'vitest';

import {
  ExtractionProcessor,
  type ExtractionProcessingRepository,
} from './extraction-processor.js';
import type { DocumentExtraction } from './extraction.js';
import {
  ExtractionConfidence,
  type RateConfirmationAiProvider,
  type RateConfirmationExtractionResult,
} from './rate-confirmation-ai.js';
import type { ObjectStorage } from '../storage/object-storage.js';

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

const result: RateConfirmationExtractionResult = {
  brokerName: { value: 'Example Broker', confidence: ExtractionConfidence.HIGH },
  brokerContactName: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  brokerContactPhone: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  brokerContactEmail: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  brokerLoadNumber: { value: 'BR-42', confidence: ExtractionConfidence.HIGH },
  rate: { value: '$1,000.00', confidence: ExtractionConfidence.HIGH },
  commodity: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  weight: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  pieces: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  equipmentType: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  temperatureRequirements: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  specialInstructions: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  detentionTerms: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  layoverTerms: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  tonuTerms: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  lumperInstructions: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  trackingRequirements: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  podRequirements: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  invoicingInstructions: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  billingEmail: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  billingAddress: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  factoringInformation: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  requiredDocuments: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  notes: { value: null, confidence: ExtractionConfidence.NOT_FOUND },
  stops: [],
};

const storage = (contents = Buffer.from('rate confirmation')): ObjectStorage => ({
  putObject: async () => undefined,
  getObject: async () => contents,
  deleteObject: async () => undefined,
  createDownloadUrl: async () => 'https://storage.example/download',
});

const provider = (
  overrides: Partial<RateConfirmationAiProvider> = {},
): RateConfirmationAiProvider => ({
  name: 'mock',
  model: null,
  extract: async () => result,
  ...overrides,
});

const repository = (
  events: string[],
  record: {
    extraction: DocumentExtraction;
    document: { id: string; filename: string; mimeType: string; storageKey: string };
  } | null = {
    extraction,
    document: {
      id: extraction.documentId,
      filename: 'rate-confirmation.pdf',
      mimeType: 'application/pdf',
      storageKey: 'loads/example.pdf',
    },
  },
): ExtractionProcessingRepository => ({
  findByIdWithDocument: async () => record,
  markProcessing: async () => {
    events.push('processing');
  },
  markCompleted: async () => {
    events.push('completed');
  },
  markFailed: async () => {
    events.push('failed');
  },
});

describe('ExtractionProcessor', () => {
  it('downloads, extracts, and stores a structured result', async () => {
    const events: string[] = [];
    const service = new ExtractionProcessor(
      repository(events),
      storage(),
      provider({ model: 'model-a' }),
    );

    await expect(service.process(extraction.id)).resolves.toBeUndefined();
    expect(events).toEqual(['processing', 'completed']);
  });

  it('marks an extraction as failed and rethrows a provider failure', async () => {
    const events: string[] = [];
    const service = new ExtractionProcessor(
      repository(events),
      storage(),
      provider({
        extract: async () => {
          throw new Error('Provider unavailable');
        },
      }),
    );

    await expect(service.process(extraction.id)).rejects.toThrow('Provider unavailable');
    expect(events).toEqual(['processing', 'failed']);
  });

  it('rejects a job for an extraction that no longer exists', async () => {
    const service = new ExtractionProcessor(repository([], null), storage(), provider());

    await expect(service.process(extraction.id)).rejects.toThrow('was not found');
  });
});
