import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { LoadDetails, LoadRepository } from './load.service.js';
import { StopService, type StopRepository } from './stop.service.js';
import type { Stop } from '../domain/stop.js';

const load: LoadDetails = {
  id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
  brokerLoadNumber: null,
  createdAt: new Date(),
  internalLoadId: null,
  status: 'DRAFT',
  stops: [],
};

const stop: Stop = {
  id: 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757',
  loadId: load.id,
  type: 'PICKUP',
  position: 1,
  facilityName: 'Acme Warehouse',
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  countryCode: 'US',
  appointmentAt: null,
  referenceNumber: null,
  instructions: null,
};

const existingLoadRepository = (): LoadRepository => ({
  create: async (draft) => draft,
  confirm: async () => load,
  updateBrokerLoadNumber: async () => load,
  findById: async () => load,
});

describe('StopService', () => {
  it('creates a stop when the load exists', async () => {
    const repository: StopRepository = {
      create: async () => stop,
      update: async () => stop,
      delete: async () => true,
      reorder: async () => [stop],
    };
    const service = new StopService(existingLoadRepository(), repository);

    await expect(service.create(load.id, { type: 'PICKUP' })).resolves.toEqual(stop);
  });

  it('rejects a stop creation for an unknown load', async () => {
    const loadRepository: LoadRepository = {
      create: async (draft) => draft,
      confirm: async () => null,
      updateBrokerLoadNumber: async () => null,
      findById: async () => null,
    };
    const repository: StopRepository = {
      create: async () => stop,
      update: async () => stop,
      delete: async () => true,
      reorder: async () => [stop],
    };
    const service = new StopService(loadRepository, repository);

    await expect(service.create(load.id, { type: 'PICKUP' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns not found when an update or deletion targets another stop', async () => {
    const repository: StopRepository = {
      create: async () => stop,
      update: async () => null,
      delete: async () => false,
      reorder: async () => [stop],
    };
    const service = new StopService(existingLoadRepository(), repository);

    await expect(service.update(load.id, stop.id, { city: 'Dallas' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.delete(load.id, stop.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and deletes a stop that belongs to the load', async () => {
    const repository: StopRepository = {
      create: async () => stop,
      update: async () => ({ ...stop, city: 'Dallas' }),
      delete: async () => true,
      reorder: async () => [stop],
    };
    const service = new StopService(existingLoadRepository(), repository);

    await expect(service.update(load.id, stop.id, { city: 'Dallas' })).resolves.toMatchObject({
      city: 'Dallas',
    });
    await expect(service.delete(load.id, stop.id)).resolves.toBeUndefined();
  });

  it('does not edit a stop when its load no longer exists', async () => {
    const loadRepository: LoadRepository = {
      create: async (draft) => draft,
      confirm: async () => null,
      updateBrokerLoadNumber: async () => null,
      findById: async () => null,
    };
    const repository: StopRepository = {
      create: async () => stop,
      update: async () => stop,
      delete: async () => true,
      reorder: async () => [stop],
    };

    await expect(
      new StopService(loadRepository, repository).update(load.id, stop.id, { city: 'Dallas' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a complete reordered route and rejects an incomplete one', async () => {
    const validRepository: StopRepository = {
      create: async () => stop,
      update: async () => stop,
      delete: async () => true,
      reorder: async () => [stop],
    };
    const invalidRepository: StopRepository = {
      ...validRepository,
      reorder: async () => null,
    };

    await expect(
      new StopService(existingLoadRepository(), validRepository).reorder(load.id, [stop.id]),
    ).resolves.toEqual([stop]);
    await expect(
      new StopService(existingLoadRepository(), invalidRepository).reorder(load.id, [stop.id]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
