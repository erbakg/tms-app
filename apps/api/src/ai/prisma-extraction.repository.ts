import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { DocumentExtraction } from './extraction.js';
import type { ExtractionRepository } from './extraction.service.js';

@Injectable()
export class PrismaExtractionRepository implements ExtractionRepository {
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
}
