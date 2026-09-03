import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import type {
  CreateStopInput,
  CreateExtractedStopInput,
  StopRepository,
  UpdateStopInput,
} from '../application/stop.service.js';
import type { Stop } from '../domain/stop.js';

@Injectable()
export class PrismaStopRepository implements StopRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(loadId: string, input: CreateStopInput): Promise<Stop> {
    const aggregate = await this.prisma.stop.aggregate({
      where: { loadId },
      _max: { position: true },
    });
    const position = (aggregate._max.position ?? 0) + 1;

    return this.prisma.stop.create({
      data: {
        loadId,
        position,
        type: input.type,
        facilityName: input.facilityName,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        appointmentAt: input.appointmentAt,
        referenceNumber: input.referenceNumber,
        instructions: input.instructions,
      },
    });
  }

  async createMany(loadId: string, inputs: CreateExtractedStopInput[]): Promise<Stop[]> {
    return this.prisma.$transaction(async (transaction) => {
      const existingCount = await transaction.stop.count({ where: { loadId } });
      if (existingCount > 0) {
        throw new Error('Cannot apply extracted stops to a route that already has stops.');
      }

      return Promise.all(
        inputs.map((input, index) =>
          transaction.stop.create({
            data: {
              loadId,
              position: index + 1,
              type: input.type,
              facilityName: input.facilityName,
              addressLine1: input.addressLine1,
              appointmentAt: input.appointmentAt,
              referenceNumber: input.referenceNumber,
              instructions: input.instructions,
            },
          }),
        ),
      );
    });
  }

  async update(loadId: string, stopId: string, input: UpdateStopInput): Promise<Stop | null> {
    const existing = await this.prisma.stop.findFirst({ where: { id: stopId, loadId } });

    if (existing === null) {
      return null;
    }

    return this.prisma.stop.update({
      where: { id: stopId },
      data: input,
    });
  }

  async delete(loadId: string, stopId: string): Promise<boolean> {
    const result = await this.prisma.stop.deleteMany({ where: { id: stopId, loadId } });

    return result.count === 1;
  }

  async reorder(loadId: string, stopIds: string[]): Promise<Stop[] | null> {
    const existing = await this.prisma.stop.findMany({ where: { loadId } });

    if (existing.length !== stopIds.length || new Set(stopIds).size !== stopIds.length) {
      return null;
    }

    const existingIds = new Set(existing.map((stop) => stop.id));

    if (stopIds.some((stopId) => !existingIds.has(stopId))) {
      return null;
    }

    const highestPosition = Math.max(...existing.map((stop) => stop.position), 0);

    await this.prisma.$transaction([
      ...stopIds.map((stopId, index) =>
        this.prisma.stop.update({
          where: { id: stopId },
          data: { position: highestPosition + index + 1 },
        }),
      ),
      ...stopIds.map((stopId, index) =>
        this.prisma.stop.update({
          where: { id: stopId },
          data: { position: index + 1 },
        }),
      ),
    ]);

    return this.prisma.stop.findMany({ where: { loadId }, orderBy: { position: 'asc' } });
  }
}
