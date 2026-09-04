import { describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { LoadService, type Load, type LoadDetails, type LoadRepository } from './load.service.js';

describe('LoadService', () => {
  it('creates an editable draft without assigning an internal load ID', async () => {
    const repository = createRepository();
    const service = new LoadService(repository);

    const load = await service.createDraft({ brokerLoadNumber: '784521' });

    expect(load).toMatchObject({
      status: 'DRAFT',
      brokerLoadNumber: '784521',
      internalLoadId: null,
    });
    expect(load.id).toEqual(expect.any(String));
    expect(load.createdAt).toBeInstanceOf(Date);
  });

  it('allows a draft to be created before the broker load number is known', async () => {
    const repository = createRepository();
    const service = new LoadService(repository);

    const load = await service.createDraft({});

    expect(load.brokerLoadNumber).toBeNull();
    expect(load.status).toBe('DRAFT');
  });

  it('returns the persisted draft with its stops', async () => {
    const existing: LoadDetails = {
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: '784521',
      createdAt: new Date(),
      internalLoadId: null,
      status: 'DRAFT',
      stops: [],
      assignedDriver: null,
      fieldVisibility: [],
    };
    const repository: LoadRepository = {
      create: async (load) => load,
      findById: async () => existing,
      confirm: async () => existing,
      update: async () => existing,
      assignDriver: async () => existing,
      setDriverFieldVisibility: async () => undefined,
      findAssignedToDriver: async () => [],
      findRecent: async () => [],
    };
    const service = new LoadService(repository);

    await expect(service.findById(existing.id)).resolves.toEqual(existing);
  });

  it('returns recent loads for the dispatcher workspace', async () => {
    const draft: Load = {
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: 'BR-42',
      createdAt: new Date(),
      internalLoadId: null,
      status: 'DRAFT',
    };
    const service = new LoadService({ ...createRepository(), findRecent: async () => [draft] });

    await expect(service.findRecent()).resolves.toEqual([draft]);
  });

  it('confirms a draft and rejects an unknown load', async () => {
    const confirmed: LoadDetails = {
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: null,
      createdAt: new Date(),
      internalLoadId: '312KG-10000',
      status: 'CONFIRMED',
      stops: [],
      assignedDriver: null,
      fieldVisibility: [],
    };
    const service = new LoadService({ ...createRepository(), confirm: async () => confirmed });
    await expect(service.confirm(confirmed.id)).resolves.toMatchObject({
      status: 'CONFIRMED',
      internalLoadId: '312KG-10000',
    });
    await expect(
      new LoadService({ ...createRepository(), confirm: async () => null }).confirm(confirmed.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns only a confirmed load to a driver', async () => {
    const confirmed: LoadDetails = {
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: null,
      createdAt: new Date(),
      internalLoadId: '312KG-10001',
      status: 'CONFIRMED',
      stops: [],
      assignedDriver: null,
      fieldVisibility: [],
    };
    const service = new LoadService({
      ...createRepository(),
      findById: async () => confirmed,
      assignDriver: async () => confirmed,
    });
    await expect(
      service.assignDriver(confirmed.id, 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757'),
    ).resolves.toEqual(confirmed);

    await expect(
      new LoadService({
        ...createRepository(),
        findById: async () => ({ ...confirmed, status: 'DRAFT' }),
      }).assignDriver(confirmed.id, 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

const createRepository = (): LoadRepository => ({
  create: async (load) => load,
  findById: async () => null,
  confirm: async () => null,
  update: async () => null,
  assignDriver: async () => null,
  setDriverFieldVisibility: async () => undefined,
  findAssignedToDriver: async () => [],
  findRecent: async () => [],
});
