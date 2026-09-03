import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import type { Load, LoadRepository } from '../application/load.service.js';

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

    return {
      id: stored.id,
      brokerLoadNumber: stored.brokerLoadNumber,
      createdAt: stored.createdAt,
      internalLoadId: stored.internalLoadId,
      status: stored.status,
    };
  }
}
