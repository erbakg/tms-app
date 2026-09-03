import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { LoadStatus } from '../domain/load-status.js';
import { PrismaLoadRepository } from './prisma-load.repository.js';

describe('PrismaLoadRepository', () => {
  const prisma = new PrismaClient();
  const repository = new PrismaLoadRepository(prisma);

  beforeEach(async () => {
    await prisma.load.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists a new editable draft load', async () => {
    const createdAt = new Date('2026-09-03T12:00:00.000Z');
    const draft = await repository.create({
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: '784521',
      createdAt,
      internalLoadId: null,
      status: LoadStatus.DRAFT,
    });

    const stored = await prisma.load.findUniqueOrThrow({ where: { id: draft.id } });

    expect(stored).toMatchObject({
      brokerLoadNumber: '784521',
      internalLoadId: null,
      status: 'DRAFT',
    });
  });
});
