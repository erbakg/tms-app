import { describe, expect, it } from 'vitest';

import { LoadService, type LoadRepository } from './load.service.js';

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
});

const createRepository = (): LoadRepository => ({
  create: async (load) => load,
});
