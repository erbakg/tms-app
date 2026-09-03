import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import type { DocumentRepository } from '../application/document.service.js';
import type { LoadDocument } from '../domain/load-document.js';

@Injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createNextRateConfirmation(
    input: Omit<LoadDocument, 'id' | 'version' | 'isCurrent' | 'createdAt'>,
  ): Promise<LoadDocument> {
    return this.prisma.$transaction(async (transaction) => {
      const latestVersion = await transaction.loadDocument.aggregate({
        where: { loadId: input.loadId, kind: 'RATE_CONFIRMATION' },
        _max: { version: true },
      });

      await transaction.loadDocument.updateMany({
        where: { loadId: input.loadId, kind: 'RATE_CONFIRMATION', isCurrent: true },
        data: { isCurrent: false },
      });

      return transaction.loadDocument.create({
        data: {
          ...input,
          version: (latestVersion._max.version ?? 0) + 1,
          isCurrent: true,
        },
      });
    });
  }

  findByLoadId(loadId: string): Promise<LoadDocument[]> {
    return this.prisma.loadDocument.findMany({ where: { loadId }, orderBy: { version: 'asc' } });
  }

  findByLoadIdAndId(loadId: string, documentId: string): Promise<LoadDocument | null> {
    return this.prisma.loadDocument.findFirst({ where: { id: documentId, loadId } });
  }
}
