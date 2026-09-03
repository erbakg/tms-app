import { Inject, Injectable } from '@nestjs/common';

import { DocumentService } from './document.service.js';
import { LoadService } from './load.service.js';
import type { Load } from './load.service.js';
import type { LoadDocument } from '../domain/load-document.js';

export interface RateConfirmationIntakeInput {
  filename: string;
  mimeType: string;
  contents: Buffer;
  brokerLoadNumber?: string;
}

export interface RateConfirmationIntakeResult {
  load: Load;
  document: LoadDocument;
}

@Injectable()
export class RateConfirmationIntakeService {
  constructor(
    @Inject(LoadService) private readonly loadService: LoadService,
    @Inject(DocumentService) private readonly documentService: DocumentService,
  ) {}

  async createDraftFromRateConfirmation(
    input: RateConfirmationIntakeInput,
  ): Promise<RateConfirmationIntakeResult> {
    const load = await this.loadService.createDraft({ brokerLoadNumber: input.brokerLoadNumber });
    const document = await this.documentService.uploadRateConfirmation(load.id, input);
    return { load, document };
  }
}
