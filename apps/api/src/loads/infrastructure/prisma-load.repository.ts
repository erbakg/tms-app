import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import type { Load, LoadDetails, LoadRepository } from '../application/load.service.js';
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
      include: { stops: { orderBy: { position: 'asc' } } },
    });

    if (stored === null) {
      return null;
    }

    return {
      ...this.toLoad(stored),
      stops: stored.stops.map((stop) => this.toStop(stop)),
    };
  }

  private toLoad(stored: {
    id: string;
    brokerLoadNumber: string | null;
    createdAt: Date;
    internalLoadId: string | null;
    status: Load['status'];
  }): Load {
    return {
      id: stored.id,
      brokerLoadNumber: stored.brokerLoadNumber,
      createdAt: stored.createdAt,
      internalLoadId: stored.internalLoadId,
      status: stored.status,
    };
  }

  private toStop(stored: Stop): Stop {
    return stored;
  }
}
