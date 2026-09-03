import { BadRequestException, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { DocumentService } from '../application/document.service.js';
import type { LoadDocument } from '../domain/load-document.js';

const SUPPORTED_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

@Controller('loads/:loadId/documents')
export class DocumentsController {
  constructor(@Inject(DocumentService) private readonly documentService: DocumentService) {}

  @Post()
  async uploadRateConfirmation(
    @Param('loadId') loadId: string,
    @Req() request: FastifyRequest,
  ): Promise<LoadDocument> {
    const uploadedFile = await request.file();

    if (uploadedFile === undefined) {
      throw new BadRequestException({ code: 'FILE_REQUIRED' });
    }

    if (!SUPPORTED_DOCUMENT_MIME_TYPES.has(uploadedFile.mimetype)) {
      throw new BadRequestException({ code: 'UNSUPPORTED_DOCUMENT_TYPE' });
    }

    return this.documentService.uploadRateConfirmation(loadId, {
      filename: uploadedFile.filename,
      mimeType: uploadedFile.mimetype,
      contents: await uploadedFile.toBuffer(),
    });
  }

  @Get()
  findByLoadId(@Param('loadId') loadId: string): Promise<LoadDocument[]> {
    return this.documentService.findByLoadId(loadId);
  }

  @Get(':documentId/download')
  async getDownloadUrl(
    @Param('loadId') loadId: string,
    @Param('documentId') documentId: string,
  ): Promise<{ url: string }> {
    return { url: await this.documentService.getDownloadUrl(loadId, documentId) };
  }
}
