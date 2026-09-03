import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { DocumentExtraction } from './extraction.js';
import type { ExtractionProcessingRepository, ExtractionDocument } from './extraction-processor.js';
import type { RateConfirmationExtractionResult } from './rate-confirmation-ai.js';
import type { ExtractionRepository } from './extraction.service.js';

@Injectable()
export class PrismaExtractionRepository
  implements ExtractionRepository, ExtractionProcessingRepository
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createPending(documentId: string, provider: string): Promise<DocumentExtraction> {
    return this.prisma.documentExtraction.upsert({
      where: { documentId },
      create: { documentId, provider },
      update: { provider, status: 'PENDING', error: null, result: undefined },
    });
  }

  findByDocumentId(documentId: string): Promise<DocumentExtraction | null> {
    return this.prisma.documentExtraction.findUnique({ where: { documentId } });
  }

  async findByIdWithDocument(
    extractionId: string,
  ): Promise<{ extraction: DocumentExtraction; document: ExtractionDocument } | null> {
    const extraction = await this.prisma.documentExtraction.findUnique({
      where: { id: extractionId },
      include: { document: true },
    });

    if (extraction === null) {
      return null;
    }

    return { extraction, document: extraction.document };
  }

  async markProcessing(extractionId: string): Promise<void> {
    await this.prisma.documentExtraction.update({
      where: { id: extractionId },
      data: { status: 'PROCESSING', startedAt: new Date(), error: null },
    });
  }

  async markCompleted(
    extractionId: string,
    model: string | null,
    result: RateConfirmationExtractionResult,
  ): Promise<void> {
    await this.prisma.documentExtraction.update({
      where: { id: extractionId },
      data: {
        status: 'COMPLETED',
        model,
        result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        error: null,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(extractionId: string, error: string): Promise<void> {
    await this.prisma.documentExtraction.update({
      where: { id: extractionId },
      data: { status: 'FAILED', error, completedAt: new Date() },
    });
  }
}
