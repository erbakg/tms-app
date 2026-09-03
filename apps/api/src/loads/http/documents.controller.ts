import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { Roles } from '../../auth/auth.decorators.js';

import { DocumentService } from '../application/document.service.js';
import { StopService } from '../application/stop.service.js';
import type { LoadDocument } from '../domain/load-document.js';
import type { Stop } from '../domain/stop.js';
import type { DocumentExtraction } from '../../ai/extraction.js';
import { rateConfirmationExtractionSchema } from '../../ai/gemini-rate-confirmation-ai.provider.js';

const SUPPORTED_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
@Roles('ADMIN', 'DISPATCHER')
@Controller('loads/:loadId/documents')
export class DocumentsController {
  constructor(
    @Inject(DocumentService) private readonly documentService: DocumentService,
    @Inject(StopService) private readonly stopService: StopService,
  ) {}

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

  @Get(':documentId/extraction')
  getExtraction(
    @Param('loadId') loadId: string,
    @Param('documentId') documentId: string,
  ): Promise<DocumentExtraction> {
    return this.documentService.getExtraction(loadId, documentId);
  }

  @Post(':documentId/extraction/apply-stops')
  async applyStops(
    @Param('loadId') loadId: string,
    @Param('documentId') documentId: string,
  ): Promise<Stop[]> {
    const extraction = await this.documentService.getExtraction(loadId, documentId);
    if (extraction.status !== 'COMPLETED')
      throw new ConflictException({ code: 'EXTRACTION_NOT_COMPLETED' });
    const parsed = rateConfirmationExtractionSchema.safeParse(extraction.result);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_EXTRACTION_RESULT' });

    return this.stopService.createFromExtraction(
      loadId,
      parsed.data.stops.map((stop) => ({
        type: stop.type,
        facilityName: stop.facilityName.value ?? undefined,
        addressLine1: stop.address.value ?? undefined,
        appointmentAt: parseAppointment(stop.appointment.value),
        referenceNumber: stop.referenceNumber.value ?? undefined,
        instructions: stop.instructions.value ?? undefined,
      })),
    );
  }

  @Get(':documentId/download')
  async getDownloadUrl(
    @Param('loadId') loadId: string,
    @Param('documentId') documentId: string,
  ): Promise<{ url: string }> {
    return { url: await this.documentService.getDownloadUrl(loadId, documentId) };
  }
}

const parseAppointment = (value: string | null): Date | null | undefined => {
  if (value === null) return undefined;
  const appointment = new Date(value);
  return Number.isNaN(appointment.getTime()) ? undefined : appointment;
};
