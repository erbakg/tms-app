import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { LoadService, type LoadDetails, type LoadRepository } from './load.service.js';

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
    };
    const repository: LoadRepository = {
      create: async (load) => load,
      findById: async () => existing,
      confirm: async () => existing,
    };
    const service = new LoadService(repository);

    await expect(service.findById(existing.id)).resolves.toEqual(existing);
  });

  it('confirms a draft and rejects an unknown load', async () => {
    const confirmed: LoadDetails = {
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: null,
      createdAt: new Date(),
      internalLoadId: '312KG-10000',
      status: 'CONFIRMED',
      stops: [],
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
});

const createRepository = (): LoadRepository => ({
  create: async (load) => load,
  findById: async () => null,
  confirm: async () => null,
});
