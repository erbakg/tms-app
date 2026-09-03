import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { LoadStatus, type LoadStatus as LoadStatusValue } from '../domain/load-status.js';
import type { Stop } from '../domain/stop.js';

export interface Load {
  id: string;
  brokerLoadNumber: string | null;
  createdAt: Date;
  internalLoadId: string | null;
  status: LoadStatusValue;
}

export interface CreateLoadDraftInput {
  brokerLoadNumber?: string;
}

export interface LoadRepository {
  create(load: Load): Promise<Load>;
  findById(id: string): Promise<LoadDetails | null>;
}

export interface LoadDetails extends Load {
  stops: Stop[];
}

export const LOAD_REPOSITORY = Symbol('LOAD_REPOSITORY');

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
}
