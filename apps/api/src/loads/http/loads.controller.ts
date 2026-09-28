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
import type { AuthenticatedUser } from '../../auth/auth.types.js';

import { DRIVER_VISIBLE_FIELDS, LoadService } from '../application/load.service.js';
import { RateConfirmationIntakeService } from '../application/rate-confirmation-intake.service.js';
import type { CreateManualLoadInput, Load, LoadDetails } from '../application/load.service.js';
import type { RateConfirmationIntakeResult } from '../application/rate-confirmation-intake.service.js';

const createLoadDraftSchema = z.object({
  brokerLoadNumber: z.string().trim().min(1).max(100).optional(),
});
const manualStopSchema = z.object({
  type: z.enum(['PICKUP', 'DELIVERY']),
  facilityName: z.string().trim().max(200).default(''),
  addressLine1: z.string().trim().max(200).default(''),
  city: z.string().trim().max(100).default(''),
  state: z.string().trim().max(100).default(''),
  postalCode: z.string().trim().max(20).default(''),
  appointmentType: z.enum(['FCFS', 'BY_APPOINTMENT']),
  appointmentStartAt: z.string().datetime().nullable().optional(),
  appointmentEndAt: z.string().datetime().nullable().optional(),
  appointmentAt: z.string().datetime().nullable().optional(),
  instructions: z.string().trim().max(4_000).optional(),
});
const manualCommoditySchema = z.object({
  fromPosition: z.number().int().positive(),
  toPosition: z.number().int().positive(),
  commodity: z.string().trim().max(200).default(''),
  description: z.string().trim().max(2_000).default(''),
  weight: z.string().trim().max(100).default(''),
  units: z.number().int().nonnegative().optional(),
  pallets: z.number().int().nonnegative().optional(),
});
const createManualLoadSchema = z
  .object({
    saveAsDraft: z.boolean().default(false),
    customerName: z.string().trim().max(200).optional(),
    billTo: z.string().trim().max(200).optional(),
    operatingCompany: z.string().trim().max(200).optional(),
    bookedByName: z.string().trim().max(200).optional(),
    bookedForTeam: z.string().trim().max(200).optional(),
    brokerLoadNumber: z.string().trim().max(100).optional(),
    bolNumber: z.string().trim().max(100).optional(),
    pickupNumber: z.string().trim().max(100).optional(),
    poNumber: z.string().trim().max(100).optional(),
    consigneeReference: z.string().trim().max(100).optional(),
    equipmentType: z.string().trim().max(100).optional(),
    preloadedTrailer: z.boolean().default(false),
    preloadedTrailerNumber: z.string().trim().max(100).optional(),
    stops: z.array(manualStopSchema).default([]),
    commodities: z.array(manualCommoditySchema).default([]),
    rate: z.string().trim().max(100).optional(),
    driverPayAmount: z.string().trim().max(100).optional(),
    driverPayMethod: z.string().trim().max(50).optional(),
  })
  .superRefine((input, context) => {
    if (!input.saveAsDraft && input.stops.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stops'],
        message: 'At least two stops are required.',
      });
    }
    if (!input.saveAsDraft) {
      input.stops.forEach((stop, index) => {
        if (
          !stop.facilityName ||
          !stop.addressLine1 ||
          !stop.city ||
          !stop.state ||
          !stop.postalCode
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['stops', index],
            message: 'Facility and address fields are required for every stop.',
          });
        }
      });
      input.commodities.forEach((commodity, index) => {
        if (!commodity.commodity) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['commodities', index, 'commodity'],
            message: 'Commodity is required.',
          });
        }
      });
    }
    if (input.preloadedTrailer && !input.preloadedTrailerNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preloadedTrailerNumber'],
        message: 'Trailer number is required.',
      });
    }
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

  @Post('manual')
  createManual(@Req() request: FastifyRequest, @Body() body: unknown): Promise<Load> {
    const parsed = createManualLoadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_MANUAL_LOAD', issues: parsed.error.issues });
    }

    const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
    if (user === undefined) throw new BadRequestException({ code: 'USER_REQUIRED' });

    const toDate = (value: string | null | undefined): Date | null | undefined =>
      value === undefined || value === null ? value : new Date(value);
    const input: CreateManualLoadInput = {
      ...parsed.data,
      enteredByUserId: user.id,
      enteredByName: user.fullName ?? user.email,
      stops: parsed.data.stops.map((stop) => ({
        ...stop,
        appointmentStartAt: toDate(stop.appointmentStartAt),
        appointmentEndAt: toDate(stop.appointmentEndAt),
        appointmentAt: toDate(stop.appointmentAt),
      })),
    };
    return this.loadService.createManual(input);
  }

  @Get()
  findRecent(): Promise<Load[]> {
    return this.loadService.findRecent();
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
