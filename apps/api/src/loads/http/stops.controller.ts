import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';

import { StopService } from '../application/stop.service.js';
import type { Stop } from '../domain/stop.js';

const createStopSchema = z.object({
  type: z.enum(['PICKUP', 'DELIVERY']),
  facilityName: z.string().trim().min(1).max(200).optional(),
  addressLine1: z.string().trim().min(1).max(200).optional(),
  addressLine2: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  postalCode: z.string().trim().min(1).max(20).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  appointmentAt: z.string().datetime().optional().nullable(),
  referenceNumber: z.string().trim().min(1).max(100).optional(),
  instructions: z.string().trim().min(1).max(4_000).optional(),
});

const updateStopSchema = createStopSchema
  .omit({ type: true })
  .extend({ type: z.enum(['PICKUP', 'DELIVERY']).optional() })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'At least one field is required.');

const reorderStopsSchema = z.object({
  stopIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((stopIds) => new Set(stopIds).size === stopIds.length, 'Stop IDs must be unique.'),
});

@Controller('loads/:loadId/stops')
export class StopsController {
  constructor(@Inject(StopService) private readonly stopService: StopService) {}

  @Post()
  create(@Param('loadId') loadId: string, @Body() body: unknown): Promise<Stop> {
    const parsed = createStopSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_STOP',
        issues: parsed.error.issues,
      });
    }

    return this.stopService.create(loadId, {
      ...parsed.data,
      appointmentAt:
        parsed.data.appointmentAt === undefined || parsed.data.appointmentAt === null
          ? parsed.data.appointmentAt
          : new Date(parsed.data.appointmentAt),
    });
  }

  @Patch('reorder')
  reorder(@Param('loadId') loadId: string, @Body() body: unknown): Promise<Stop[]> {
    const parsed = reorderStopsSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_STOP_ORDER',
        issues: parsed.error.issues,
      });
    }

    return this.stopService.reorder(loadId, parsed.data.stopIds);
  }

  @Patch(':stopId')
  update(
    @Param('loadId') loadId: string,
    @Param('stopId') stopId: string,
    @Body() body: unknown,
  ): Promise<Stop> {
    const parsed = updateStopSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_STOP',
        issues: parsed.error.issues,
      });
    }

    return this.stopService.update(loadId, stopId, {
      ...parsed.data,
      appointmentAt:
        parsed.data.appointmentAt === undefined || parsed.data.appointmentAt === null
          ? parsed.data.appointmentAt
          : new Date(parsed.data.appointmentAt),
    });
  }

  @Delete(':stopId')
  @HttpCode(204)
  async delete(@Param('loadId') loadId: string, @Param('stopId') stopId: string): Promise<void> {
    await this.stopService.delete(loadId, stopId);
  }
}
