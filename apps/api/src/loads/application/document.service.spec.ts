import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DocumentService, type DocumentRepository } from './document.service.js';
import type { LoadDetails, LoadRepository } from './load.service.js';
import type { ExtractionService } from '../../ai/extraction.service.js';
import type { DocumentExtraction } from '../../ai/extraction.js';
import type { ObjectStorage } from '../../storage/object-storage.js';
import type { LoadDocument } from '../domain/load-document.js';

const load: LoadDetails = {
  id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
  brokerLoadNumber: null,
  createdAt: new Date(),
  internalLoadId: null,
  status: 'DRAFT',
  stops: [],
};

const document: LoadDocument = {
  id: 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757',
  loadId: load.id,
  kind: 'RATE_CONFIRMATION',
  version: 1,
  filename: 'rate-confirmation.pdf',
  mimeType: 'application/pdf',
  storageKey: 'loads/example.pdf',
  isCurrent: true,
  createdAt: new Date(),
};

const existingLoadRepository = (): LoadRepository => ({
  create: async (draft) => draft,
  confirm: async () => (document.loadId === load.id ? load : null),
  update: async () => load,
  assignDriver: async () => load,
  setDriverFieldVisibility: async () => undefined,
  findAssignedToDriver: async () => [],
  findById: async () => load,
});

const documentRepository = (overrides: Partial<DocumentRepository> = {}): DocumentRepository => ({
  createNextRateConfirmation: async () => document,
  findByLoadId: async () => [document],
  findByLoadIdAndId: async () => document,
  ...overrides,
});

const objectStorage = (overrides: Partial<ObjectStorage> = {}): ObjectStorage => ({
  putObject: async () => undefined,
  getObject: async () => Buffer.alloc(0),
  deleteObject: async () => undefined,
  createDownloadUrl: async () => 'https://storage.example/download',
  ...overrides,
});

const extraction: DocumentExtraction = {
  id: '7e585708-4b2c-464f-b9eb-fbbd46f9ba77',
  documentId: document.id,
  status: 'PENDING',
  provider: 'mock',
  model: null,
  result: null,
  error: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
};

const extractionService = (): ExtractionService =>
  ({
    schedule: async () => extraction,
    findByDocumentId: async () => extraction,
  }) as unknown as ExtractionService;

describe('DocumentService', () => {
  it('stores the file before persisting a new Rate Confirmation version', async () => {
    let uploadedKey = '';
    const storage = objectStorage({
      putObject: async ({ key }) => {
        uploadedKey = key;
      },
    });
    const service = new DocumentService(
      existingLoadRepository(),
      documentRepository(),
      storage,
      extractionService(),
    );

    await expect(
      service.uploadRateConfirmation(load.id, {
        filename: 'revised rc.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.from('rate confirmation'),
      }),
    ).resolves.toEqual(document);
    expect(uploadedKey).toMatch(
      new RegExp(`^loads/${load.id}/rate-confirmations/.+-revised_rc\\.pdf$`),
    );
  });

  it('rejects an upload for an unknown load', async () => {
    const loadRepository: LoadRepository = {
      create: async (draft) => draft,
      confirm: async () => null,
      update: async () => null,
      assignDriver: async () => null,
      setDriverFieldVisibility: async () => undefined,
      findAssignedToDriver: async () => [],
      findById: async () => null,
    };
    const service = new DocumentService(
      loadRepository,
      documentRepository(),
      objectStorage(),
      extractionService(),
    );

    await expect(
      service.uploadRateConfirmation(load.id, {
        filename: 'rate-confirmation.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes the uploaded object if version persistence fails', async () => {
    let removedKey = '';
    const repository = documentRepository({
      createNextRateConfirmation: async () => {
        throw new Error('Database is unavailable');
      },
    });
    const storage = objectStorage({
      deleteObject: async (key) => {
        removedKey = key;
      },
    });
    const service = new DocumentService(
      existingLoadRepository(),
      repository,
      storage,
      extractionService(),
    );

    await expect(
      service.uploadRateConfirmation(load.id, {
        filename: 'rate-confirmation.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).rejects.toThrow('Database is unavailable');
    expect(removedKey).toContain('rate-confirmation.pdf');
  });

  it('lists documents and returns a temporary URL for an owned document', async () => {
    const service = new DocumentService(
      existingLoadRepository(),
      documentRepository(),
      objectStorage(),
      extractionService(),
    );

    await expect(service.findByLoadId(load.id)).resolves.toEqual([document]);
    await expect(service.getDownloadUrl(load.id, document.id)).resolves.toBe(
      'https://storage.example/download',
    );
  });

  it('does not return a download URL for a document from another load', async () => {
    const repository = documentRepository({ findByLoadIdAndId: async () => null });
    const service = new DocumentService(
      existingLoadRepository(),
      repository,
      objectStorage(),
      extractionService(),
    );

    await expect(service.getDownloadUrl(load.id, document.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns extraction only for a document belonging to the load', async () => {
    const service = new DocumentService(
      existingLoadRepository(),
      documentRepository(),
      objectStorage(),
      extractionService(),
    );

    await expect(service.getExtraction(load.id, document.id)).resolves.toEqual(extraction);
  });

  it('does not return extraction for a document from another load', async () => {
    const repository = documentRepository({ findByLoadIdAndId: async () => null });
    const service = new DocumentService(
      existingLoadRepository(),
      repository,
      objectStorage(),
      extractionService(),
    );

    await expect(service.getExtraction(load.id, document.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
