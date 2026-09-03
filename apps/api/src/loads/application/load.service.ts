import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { LoadStatus, type LoadStatus as LoadStatusValue } from '../domain/load-status.js';

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

@Injectable()
export class LoadService {
  createDraft(input: CreateLoadDraftInput): Load {
    return {
      id: randomUUID(),
      brokerLoadNumber: input.brokerLoadNumber ?? null,
      createdAt: new Date(),
      internalLoadId: null,
      status: LoadStatus.DRAFT,
    };
  }
}
