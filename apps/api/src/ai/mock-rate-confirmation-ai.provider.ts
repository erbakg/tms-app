import { Injectable } from '@nestjs/common';

import {
  ExtractionConfidence,
  type RateConfirmationAiProvider,
  type RateConfirmationExtractionInput,
  type RateConfirmationExtractionResult,
} from './rate-confirmation-ai.js';

const missingField = {
  value: null,
  confidence: ExtractionConfidence.NOT_FOUND,
} as const;

@Injectable()
export class MockRateConfirmationAiProvider implements RateConfirmationAiProvider {
  readonly name = 'mock';
  readonly model = null;

  extract(_input: RateConfirmationExtractionInput): Promise<RateConfirmationExtractionResult> {
    return Promise.resolve({
      brokerName: missingField,
      brokerLoadNumber: missingField,
      rate: missingField,
      commodity: missingField,
      weight: missingField,
      equipmentType: missingField,
      specialInstructions: missingField,
      stops: [],
    });
  }
}
