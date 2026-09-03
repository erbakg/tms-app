import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { OBJECT_STORAGE, type ObjectStorage } from '../../storage/object-storage.js';
import type { LoadRepository } from './load.service.js';
import { LOAD_REPOSITORY } from './load.service.js';
import { DocumentKind, type LoadDocument } from '../domain/load-document.js';

export interface UploadRateConfirmationInput {
  filename: string;
  mimeType: string;
  contents: Buffer;
}

export interface DocumentRepository {
  createNextRateConfirmation(
    input: Omit<LoadDocument, 'id' | 'version' | 'isCurrent' | 'createdAt'>,
  ): Promise<LoadDocument>;
  findByLoadId(loadId: string): Promise<LoadDocument[]>;
  findByLoadIdAndId(loadId: string, documentId: string): Promise<LoadDocument | null>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');

@Injectable()
export class DocumentService {
  constructor(
    @Inject(LOAD_REPOSITORY) private readonly loadRepository: LoadRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStorage,
  ) {}

  async uploadRateConfirmation(
    loadId: string,
    input: UploadRateConfirmationInput,
  ): Promise<LoadDocument> {
    await this.assertLoadExists(loadId);
    const storageKey = `loads/${loadId}/rate-confirmations/${randomUUID()}-${this.safeFilename(input.filename)}`;

    await this.objectStorage.putObject({
      key: storageKey,
      body: input.contents,
      contentType: input.mimeType,
    });

    try {
      return await this.documentRepository.createNextRateConfirmation({
        loadId,
        kind: DocumentKind.RATE_CONFIRMATION,
        filename: input.filename,
        mimeType: input.mimeType,
        storageKey,
      });
    } catch (error) {
      await this.objectStorage.deleteObject(storageKey);
      throw error;
    }
  }

  findByLoadId(loadId: string): Promise<LoadDocument[]> {
    return this.documentRepository.findByLoadId(loadId);
  }

  async getDownloadUrl(loadId: string, documentId: string): Promise<string> {
    const document = await this.documentRepository.findByLoadIdAndId(loadId, documentId);

    if (document === null) {
      throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND' });
    }

    return this.objectStorage.createDownloadUrl(document.storageKey);
  }

  private async assertLoadExists(loadId: string): Promise<void> {
    if ((await this.loadRepository.findById(loadId)) === null) {
      throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    }
  }

  private safeFilename(filename: string): string {
    return filename.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  }
}
