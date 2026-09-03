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
      brokerContactName: missingField,
      brokerContactPhone: missingField,
      brokerContactEmail: missingField,
      brokerLoadNumber: missingField,
      rate: missingField,
      commodity: missingField,
      weight: missingField,
      pieces: missingField,
      equipmentType: missingField,
      temperatureRequirements: missingField,
      specialInstructions: missingField,
      detentionTerms: missingField,
      layoverTerms: missingField,
      tonuTerms: missingField,
      lumperInstructions: missingField,
      trackingRequirements: missingField,
      podRequirements: missingField,
      invoicingInstructions: missingField,
      billingEmail: missingField,
      billingAddress: missingField,
      factoringInformation: missingField,
      requiredDocuments: missingField,
      notes: missingField,
      stops: [],
    });
  }
}
