import { Inject, Injectable } from '@nestjs/common';
import { UserRole, type PrismaClient } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import type {
  Load,
  LoadDetails,
  LoadRepository,
  DriverLoad,
  DriverVisibleField,
  UpdateLoadInput,
} from '../application/load.service.js';
import type { Stop } from '../domain/stop.js';

@Injectable()
export class PrismaLoadRepository implements LoadRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClient) {}

  async create(load: Load): Promise<Load> {
    const stored = await this.prisma.load.create({
      data: {
        id: load.id,
        brokerLoadNumber: load.brokerLoadNumber,
        createdAt: load.createdAt,
        internalLoadId: load.internalLoadId,
        status: load.status,
      },
    });

    return this.toLoad(stored);
  }

  async findById(id: string): Promise<LoadDetails | null> {
    const stored = await this.prisma.load.findUnique({
      where: { id },
      include: {
        stops: { orderBy: { position: 'asc' } },
        assignedDriver: { select: { id: true, fullName: true, email: true } },
        fieldVisibility: { orderBy: { field: 'asc' } },
      },
    });

    if (stored === null) {
      return null;
    }

    return {
      ...this.toLoad(stored),
      stops: stored.stops.map((stop) => this.toStop(stop)),
      assignedDriver: stored.assignedDriver,
      fieldVisibility: stored.fieldVisibility.map((item) => ({
        field: item.field as DriverVisibleField,
        visibleToDriver: item.visibleToDriver,
      })),
    };
  }

  async findRecent(): Promise<Load[]> {
    const loads = await this.prisma.load.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return loads.map((load) => this.toLoad(load));
  }

  async confirm(id: string): Promise<Load | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.load.findUnique({ where: { id } });
      if (current === null) {
        return null;
      }
      if (current.status === 'CONFIRMED') {
        return this.toLoad(current);
      }

      const sequence = await transaction.$queryRaw<Array<{ value: bigint }>>`
        SELECT nextval('"Load_sequenceNumber_seq"') AS value
      `;
      const sequenceNumber = Number(sequence[0]?.value);
      const confirmed = await transaction.load.update({
        where: { id },
        data: {
          internalLoadId: `312KG-${sequenceNumber}`,
          sequenceNumber,
          status: 'CONFIRMED',
        },
      });

      return this.toLoad(confirmed);
    });
  }

  async update(id: string, input: UpdateLoadInput): Promise<Load | null> {
    try {
      return this.toLoad(await this.prisma.load.update({ where: { id }, data: input }));
    } catch {
      return null;
    }
  }

  async assignDriver(id: string, driverId: string): Promise<Load | 'DRIVER_NOT_FOUND' | null> {
    return this.prisma.$transaction(async (transaction) => {
      const driver = await transaction.user.findUnique({ where: { id: driverId } });
      if (driver === null || driver.role !== UserRole.DRIVER) return 'DRIVER_NOT_FOUND';
      const load = await transaction.load.findUnique({ where: { id } });
      if (load === null) return null;
      return this.toLoad(
        await transaction.load.update({ where: { id }, data: { assignedDriverId: driverId } }),
      );
    });
  }

  async setDriverFieldVisibility(
    loadId: string,
    field: DriverVisibleField,
    visibleToDriver: boolean,
  ): Promise<void> {
    await this.prisma.loadFieldVisibility.upsert({
      where: { loadId_field: { loadId, field } },
      create: { loadId, field, visibleToDriver },
      update: { visibleToDriver },
    });
  }

  async findAssignedToDriver(driverId: string): Promise<DriverLoad[]> {
    const loads = await this.prisma.load.findMany({
      where: { assignedDriverId: driverId, status: 'CONFIRMED' },
      include: {
        stops: { orderBy: { position: 'asc' } },
        fieldVisibility: { where: { visibleToDriver: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return loads.map((load) => ({
      ...this.toLoad(load),
      stops: load.stops.map((stop) => this.toStop(stop)),
      assignedDriver: null,
      fieldVisibility: load.fieldVisibility.map((item) => ({
        field: item.field as DriverVisibleField,
        visibleToDriver: item.visibleToDriver,
      })),
    }));
  }

  private toLoad(
    stored: {
      id: string;
      brokerLoadNumber: string | null;
      createdAt: Date;
      internalLoadId: string | null;
      sequenceNumber?: number | null;
      status: Load['status'];
    } & Omit<Load, 'id' | 'brokerLoadNumber' | 'createdAt' | 'internalLoadId' | 'status'>,
  ): Load {
    return {
      id: stored.id,
      brokerLoadNumber: stored.brokerLoadNumber,
      createdAt: stored.createdAt,
      internalLoadId: stored.internalLoadId,
      status: stored.status,
      brokerName: stored.brokerName,
      brokerContactName: stored.brokerContactName,
      brokerContactPhone: stored.brokerContactPhone,
      brokerContactEmail: stored.brokerContactEmail,
      rate: stored.rate,
      commodity: stored.commodity,
      weight: stored.weight,
      pieces: stored.pieces,
      equipmentType: stored.equipmentType,
      temperatureRequirements: stored.temperatureRequirements,
      specialInstructions: stored.specialInstructions,
      detentionTerms: stored.detentionTerms,
      layoverTerms: stored.layoverTerms,
      tonuTerms: stored.tonuTerms,
      lumperInstructions: stored.lumperInstructions,
      trackingRequirements: stored.trackingRequirements,
      podRequirements: stored.podRequirements,
      invoicingInstructions: stored.invoicingInstructions,
      billingEmail: stored.billingEmail,
      billingAddress: stored.billingAddress,
      factoringInformation: stored.factoringInformation,
      requiredDocuments: stored.requiredDocuments,
      internalComments: stored.internalComments,
    };
  }

  private toStop(stored: Stop): Stop {
    return stored;
  }
}
