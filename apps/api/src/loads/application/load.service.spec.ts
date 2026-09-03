import { describe, expect, it } from 'vitest';

import { LoadService } from './load.service.js';

describe('LoadService', () => {
  it('creates an editable draft without assigning an internal load ID', () => {
    const service = new LoadService();

    const load = service.createDraft({ brokerLoadNumber: '784521' });

    expect(load).toMatchObject({
      status: 'DRAFT',
      brokerLoadNumber: '784521',
      internalLoadId: null,
    });
    expect(load.id).toEqual(expect.any(String));
    expect(load.createdAt).toBeInstanceOf(Date);
  });

  it('allows a draft to be created before the broker load number is known', () => {
    const service = new LoadService();

    const load = service.createDraft({});

    expect(load.brokerLoadNumber).toBeNull();
    expect(load.status).toBe('DRAFT');
  });
});
