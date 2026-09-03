import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { LoadRepository } from './load.service.js';
import { LOAD_REPOSITORY } from './load.service.js';
import type { Stop, StopType } from '../domain/stop.js';

export interface CreateStopInput {
  type: StopType;
  facilityName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  appointmentAt?: Date | null;
  referenceNumber?: string;
  instructions?: string;
}

export interface CreateExtractedStopInput {
  type: StopType;
  facilityName?: string;
  addressLine1?: string;
  appointmentAt?: Date | null;
  referenceNumber?: string;
  instructions?: string;
}

export interface StopRepository {
  create(loadId: string, input: CreateStopInput): Promise<Stop>;
  createMany(loadId: string, inputs: CreateExtractedStopInput[]): Promise<Stop[]>;
  update(loadId: string, stopId: string, input: UpdateStopInput): Promise<Stop | null>;
  delete(loadId: string, stopId: string): Promise<boolean>;
  reorder(loadId: string, stopIds: string[]): Promise<Stop[] | null>;
}

export const STOP_REPOSITORY = Symbol('STOP_REPOSITORY');

@Injectable()
export class StopService {
  constructor(
    @Inject(LOAD_REPOSITORY) private readonly loadRepository: LoadRepository,
    @Inject(STOP_REPOSITORY) private readonly stopRepository: StopRepository,
  ) {}

  async create(loadId: string, input: CreateStopInput): Promise<Stop> {
    const load = await this.loadRepository.findById(loadId);

    if (load === null) {
      throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    }

    return this.stopRepository.create(loadId, input);
  }

  async createFromExtraction(loadId: string, inputs: CreateExtractedStopInput[]): Promise<Stop[]> {
    const load = await this.loadRepository.findById(loadId);
    if (load === null) throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    if (load.status !== 'DRAFT') throw new ConflictException({ code: 'LOAD_NOT_EDITABLE' });
    if (load.stops.length > 0) throw new ConflictException({ code: 'STOPS_ALREADY_EXIST' });
    if (inputs.length === 0) throw new BadRequestException({ code: 'EXTRACTION_HAS_NO_STOPS' });

    return this.stopRepository.createMany(loadId, inputs);
  }

  async update(loadId: string, stopId: string, input: UpdateStopInput): Promise<Stop> {
    await this.assertLoadExists(loadId);
    const stop = await this.stopRepository.update(loadId, stopId, input);

    if (stop === null) {
      throw new NotFoundException({ code: 'STOP_NOT_FOUND' });
    }

    return stop;
  }

  async delete(loadId: string, stopId: string): Promise<void> {
    await this.assertLoadExists(loadId);
    const deleted = await this.stopRepository.delete(loadId, stopId);

    if (!deleted) {
      throw new NotFoundException({ code: 'STOP_NOT_FOUND' });
    }
  }

  async reorder(loadId: string, stopIds: string[]): Promise<Stop[]> {
    await this.assertLoadExists(loadId);
    const stops = await this.stopRepository.reorder(loadId, stopIds);

    if (stops === null) {
      throw new BadRequestException({ code: 'INVALID_STOP_ORDER' });
    }

    return stops;
  }

  private async assertLoadExists(loadId: string): Promise<void> {
    const load = await this.loadRepository.findById(loadId);

    if (load === null) {
      throw new NotFoundException({ code: 'LOAD_NOT_FOUND' });
    }
  }
}

export type UpdateStopInput = Partial<CreateStopInput>;
