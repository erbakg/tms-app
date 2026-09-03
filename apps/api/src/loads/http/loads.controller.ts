import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Patch,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { Roles } from '../../auth/auth.decorators.js';

import { DRIVER_VISIBLE_FIELDS, LoadService } from '../application/load.service.js';
import { RateConfirmationIntakeService } from '../application/rate-confirmation-intake.service.js';
import type { Load, LoadDetails } from '../application/load.service.js';
import type { RateConfirmationIntakeResult } from '../application/rate-confirmation-intake.service.js';

const createLoadDraftSchema = z.object({
  brokerLoadNumber: z.string().trim().min(1).max(100).optional(),
});
const supportedDocumentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const optionalText = z.string().trim().max(4_000).nullable();
const updateLoadSchema = z
  .object({
    brokerLoadNumber: z.string().trim().min(1).max(100).nullable().optional(),
    brokerName: optionalText.optional(),
    brokerContactName: optionalText.optional(),
    brokerContactPhone: optionalText.optional(),
    brokerContactEmail: optionalText.optional(),
    rate: optionalText.optional(),
    commodity: optionalText.optional(),
    weight: optionalText.optional(),
    pieces: optionalText.optional(),
    equipmentType: optionalText.optional(),
    temperatureRequirements: optionalText.optional(),
    specialInstructions: optionalText.optional(),
    detentionTerms: optionalText.optional(),
    layoverTerms: optionalText.optional(),
    tonuTerms: optionalText.optional(),
    lumperInstructions: optionalText.optional(),
    trackingRequirements: optionalText.optional(),
    podRequirements: optionalText.optional(),
    invoicingInstructions: optionalText.optional(),
    billingEmail: optionalText.optional(),
    billingAddress: optionalText.optional(),
    factoringInformation: optionalText.optional(),
    requiredDocuments: optionalText.optional(),
    internalComments: optionalText.optional(),
  })
  .refine((input) => Object.keys(input).length > 0);
const assignDriverSchema = z.object({ driverId: z.string().uuid() });
const driverFieldVisibilitySchema = z.object({
  field: z.enum(DRIVER_VISIBLE_FIELDS),
  visibleToDriver: z.boolean(),
});

@Roles('ADMIN', 'DISPATCHER')
@Controller('loads')
export class LoadsController {
  constructor(
    @Inject(LoadService) private readonly loadService: LoadService,
    @Inject(RateConfirmationIntakeService)
    private readonly rateConfirmationIntakeService: RateConfirmationIntakeService,
  ) {}

  @Post('rate-confirmations')
  async createFromRateConfirmation(
    @Req() request: FastifyRequest,
  ): Promise<RateConfirmationIntakeResult> {
    const uploadedFile = await request.file();
    if (uploadedFile === undefined) throw new BadRequestException({ code: 'FILE_REQUIRED' });
    if (!supportedDocumentMimeTypes.has(uploadedFile.mimetype)) {
      throw new BadRequestException({ code: 'UNSUPPORTED_DOCUMENT_TYPE' });
    }
    const brokerLoadNumberField = uploadedFile.fields.brokerLoadNumber;
    const brokerLoadNumber =
      !Array.isArray(brokerLoadNumberField) &&
      brokerLoadNumberField?.type === 'field' &&
      typeof brokerLoadNumberField.value === 'string'
        ? brokerLoadNumberField.value
        : undefined;

    return this.rateConfirmationIntakeService.createDraftFromRateConfirmation({
      filename: uploadedFile.filename,
      mimeType: uploadedFile.mimetype,
      contents: await uploadedFile.toBuffer(),
      brokerLoadNumber,
    });
  }

  @Post()
  createDraft(@Body() body: unknown): Promise<Load> {
    const parsed = createLoadDraftSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_LOAD_DRAFT',
        issues: parsed.error.issues,
      });
    }

    return this.loadService.createDraft(parsed.data);
  }

  @Get(':loadId')
  async getById(@Param('loadId') loadId: string): Promise<LoadDetails> {
    const load = await this.loadService.findById(loadId);

    if (load === null) {
      throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    }

    return load;
  }

  @Post(':loadId/confirm')
  confirm(@Param('loadId') loadId: string): Promise<Load> {
    return this.loadService.confirm(loadId);
  }

  @Patch(':loadId')
  update(@Param('loadId') loadId: string, @Body() body: unknown): Promise<Load> {
    const parsed = updateLoadSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({ code: 'INVALID_LOAD_DRAFT', issues: parsed.error.issues });
    return this.loadService.update(loadId, parsed.data);
  }

  @Post(':loadId/assign-driver')
  async assignDriver(@Param('loadId') loadId: string, @Body() body: unknown): Promise<Load> {
    const parsed = assignDriverSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_DRIVER_ASSIGNMENT',
        issues: parsed.error.issues,
      });
    return this.loadService.assignDriver(loadId, parsed.data.driverId);
  }

  @Patch(':loadId/field-visibility')
  async setDriverFieldVisibility(
    @Param('loadId') loadId: string,
    @Body() body: unknown,
  ): Promise<void> {
    const parsed = driverFieldVisibilitySchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_FIELD_VISIBILITY',
        issues: parsed.error.issues,
      });
    await this.loadService.setDriverFieldVisibility(
      loadId,
      parsed.data.field,
      parsed.data.visibleToDriver,
    );
  }
}
