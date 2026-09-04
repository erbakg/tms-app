import { randomUUID } from 'node:crypto';

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoadStatus, type LoadStatus as LoadStatusValue } from '../domain/load-status.js';
import type { Stop } from '../domain/stop.js';

export interface Load {
  id: string;
  brokerLoadNumber: string | null;
  createdAt: Date;
  internalLoadId: string | null;
  status: LoadStatusValue;
  brokerName?: string | null;
  brokerContactName?: string | null;
  brokerContactPhone?: string | null;
  brokerContactEmail?: string | null;
  rate?: string | null;
  commodity?: string | null;
  weight?: string | null;
  pieces?: string | null;
  equipmentType?: string | null;
  temperatureRequirements?: string | null;
  specialInstructions?: string | null;
  detentionTerms?: string | null;
  layoverTerms?: string | null;
  tonuTerms?: string | null;
  lumperInstructions?: string | null;
  trackingRequirements?: string | null;
  podRequirements?: string | null;
  invoicingInstructions?: string | null;
  billingEmail?: string | null;
  billingAddress?: string | null;
  factoringInformation?: string | null;
  requiredDocuments?: string | null;
  internalComments?: string | null;
}

export interface CreateLoadDraftInput {
  brokerLoadNumber?: string;
}

export type UpdateLoadInput = Partial<
  Pick<
    Load,
    | 'brokerLoadNumber'
    | 'brokerName'
    | 'brokerContactName'
    | 'brokerContactPhone'
    | 'brokerContactEmail'
    | 'rate'
    | 'commodity'
    | 'weight'
    | 'pieces'
    | 'equipmentType'
    | 'temperatureRequirements'
    | 'specialInstructions'
    | 'detentionTerms'
    | 'layoverTerms'
    | 'tonuTerms'
    | 'lumperInstructions'
    | 'trackingRequirements'
    | 'podRequirements'
    | 'invoicingInstructions'
    | 'billingEmail'
    | 'billingAddress'
    | 'factoringInformation'
    | 'requiredDocuments'
    | 'internalComments'
  >
>;

export interface LoadRepository {
  create(load: Load): Promise<Load>;
  findById(id: string): Promise<LoadDetails | null>;
  confirm(id: string): Promise<Load | null>;
  update(id: string, input: UpdateLoadInput): Promise<Load | null>;
  assignDriver(id: string, driverId: string): Promise<Load | 'DRIVER_NOT_FOUND' | null>;
  setDriverFieldVisibility(
    loadId: string,
    field: DriverVisibleField,
    visibleToDriver: boolean,
  ): Promise<void>;
  findAssignedToDriver(driverId: string): Promise<DriverLoad[]>;
  findRecent(): Promise<Load[]>;
}

export interface LoadDetails extends Load {
  stops: Stop[];
  assignedDriver: { id: string; fullName: string; email: string } | null;
  fieldVisibility: Array<{ field: DriverVisibleField; visibleToDriver: boolean }>;
}

export const LOAD_REPOSITORY = Symbol('LOAD_REPOSITORY');

export const DRIVER_VISIBLE_FIELDS = [
  'brokerLoadNumber',
  'brokerName',
  'commodity',
  'weight',
  'pieces',
  'equipmentType',
  'temperatureRequirements',
  'specialInstructions',
  'trackingRequirements',
  'podRequirements',
  'requiredDocuments',
] as const;

export type DriverVisibleField = (typeof DRIVER_VISIBLE_FIELDS)[number];

export interface DriverLoad extends LoadDetails {
  fieldVisibility: Array<{ field: DriverVisibleField; visibleToDriver: boolean }>;
}

@Injectable()
export class LoadService {
  constructor(@Inject(LOAD_REPOSITORY) private readonly loadRepository: LoadRepository) {}

  async createDraft(input: CreateLoadDraftInput): Promise<Load> {
    const draft: Load = {
      id: randomUUID(),
      brokerLoadNumber: input.brokerLoadNumber ?? null,
      createdAt: new Date(),
      internalLoadId: null,
      status: LoadStatus.DRAFT,
    };

    return this.loadRepository.create(draft);
  }

  findById(id: string): Promise<LoadDetails | null> {
    return this.loadRepository.findById(id);
  }

  findRecent(): Promise<Load[]> {
    return this.loadRepository.findRecent();
  }

  async confirm(id: string): Promise<Load> {
    const load = await this.loadRepository.confirm(id);
    if (load === null) {
      throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    }
    return load;
  }

  async update(id: string, input: UpdateLoadInput): Promise<Load> {
    const load = await this.loadRepository.update(id, input);
    if (load === null) throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    return load;
  }

  async assignDriver(id: string, driverId: string): Promise<Load> {
    const load = await this.findById(id);
    if (load === null) throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    if (load.status !== 'CONFIRMED') throw new ConflictException({ code: 'LOAD_NOT_CONFIRMED' });

    const assigned = await this.loadRepository.assignDriver(id, driverId);
    if (assigned === 'DRIVER_NOT_FOUND') throw new NotFoundException({ code: 'DRIVER_NOT_FOUND' });
    if (assigned === null) throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    return assigned;
  }

  async setDriverFieldVisibility(
    loadId: string,
    field: DriverVisibleField,
    visibleToDriver: boolean,
  ): Promise<void> {
    await this.assertLoadExists(loadId);
    await this.loadRepository.setDriverFieldVisibility(loadId, field, visibleToDriver);
  }

  findAssignedToDriver(driverId: string): Promise<DriverLoad[]> {
    return this.loadRepository.findAssignedToDriver(driverId);
  }

  private async assertLoadExists(id: string): Promise<void> {
    if ((await this.findById(id)) === null) throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
  }
}
