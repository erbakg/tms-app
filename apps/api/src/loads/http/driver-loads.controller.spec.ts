import { describe, expect, it } from 'vitest';

import { projectDriverLoad } from './driver-loads.controller.js';
import type { DriverLoad } from '../application/load.service.js';

const load: DriverLoad = {
  id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
  brokerLoadNumber: 'BR-42',
  brokerName: 'Example Broker',
  rate: '$1,000.00',
  commodity: 'Paper',
  createdAt: new Date(),
  internalLoadId: '312KG-10000',
  status: 'CONFIRMED',
  stops: [],
  assignedDriver: null,
  fieldVisibility: [
    { field: 'brokerLoadNumber', visibleToDriver: true },
    { field: 'commodity', visibleToDriver: true },
  ],
};

describe('projectDriverLoad', () => {
  it('returns assigned route data and only dispatcher-enabled non-financial fields', () => {
    expect(projectDriverLoad(load)).toEqual({
      id: load.id,
      internalLoadId: '312KG-10000',
      status: 'CONFIRMED',
      stops: [],
      brokerLoadNumber: 'BR-42',
      commodity: 'Paper',
    });
  });
});
