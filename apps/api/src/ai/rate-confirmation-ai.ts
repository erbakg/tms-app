export const ExtractionConfidence = {
  HIGH: 'HIGH',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ExtractionConfidence = (typeof ExtractionConfidence)[keyof typeof ExtractionConfidence];

export interface ExtractedText {
  value: string | null;
  confidence: ExtractionConfidence;
}

export interface ExtractedStop {
  type: 'PICKUP' | 'DELIVERY';
  facilityName: ExtractedText;
  address: ExtractedText;
  appointment: ExtractedText;
  referenceNumber: ExtractedText;
  instructions: ExtractedText;
}

export interface RateConfirmationExtractionResult {
  brokerName: ExtractedText;
  brokerContactName: ExtractedText;
  brokerContactPhone: ExtractedText;
  brokerContactEmail: ExtractedText;
  brokerLoadNumber: ExtractedText;
  rate: ExtractedText;
  commodity: ExtractedText;
  weight: ExtractedText;
  pieces: ExtractedText;
  equipmentType: ExtractedText;
  temperatureRequirements: ExtractedText;
  specialInstructions: ExtractedText;
  detentionTerms: ExtractedText;
  layoverTerms: ExtractedText;
  tonuTerms: ExtractedText;
  lumperInstructions: ExtractedText;
  trackingRequirements: ExtractedText;
  podRequirements: ExtractedText;
  invoicingInstructions: ExtractedText;
  billingEmail: ExtractedText;
  billingAddress: ExtractedText;
  factoringInformation: ExtractedText;
  requiredDocuments: ExtractedText;
  notes: ExtractedText;
  stops: ExtractedStop[];
}

export interface RateConfirmationExtractionInput {
  contents: Buffer;
  filename: string;
  mimeType: string;
}

export interface RateConfirmationAiProvider {
  readonly name: string;
  readonly model: string | null;
  extract(input: RateConfirmationExtractionInput): Promise<RateConfirmationExtractionResult>;
}

export const RATE_CONFIRMATION_AI_PROVIDER = Symbol('RATE_CONFIRMATION_AI_PROVIDER');
