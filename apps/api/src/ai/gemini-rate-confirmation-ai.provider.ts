import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import {
  ExtractionConfidence,
  type RateConfirmationAiProvider,
  type RateConfirmationExtractionInput,
  type RateConfirmationExtractionResult,
} from './rate-confirmation-ai.js';

const fieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.enum(ExtractionConfidence),
});

export const rateConfirmationExtractionSchema = z.object({
  brokerName: fieldSchema,
  brokerContactName: fieldSchema,
  brokerContactPhone: fieldSchema,
  brokerContactEmail: fieldSchema,
  brokerLoadNumber: fieldSchema,
  rate: fieldSchema,
  commodity: fieldSchema,
  weight: fieldSchema,
  pieces: fieldSchema,
  equipmentType: fieldSchema,
  temperatureRequirements: fieldSchema,
  specialInstructions: fieldSchema,
  detentionTerms: fieldSchema,
  layoverTerms: fieldSchema,
  tonuTerms: fieldSchema,
  lumperInstructions: fieldSchema,
  trackingRequirements: fieldSchema,
  podRequirements: fieldSchema,
  invoicingInstructions: fieldSchema,
  billingEmail: fieldSchema,
  billingAddress: fieldSchema,
  factoringInformation: fieldSchema,
  requiredDocuments: fieldSchema,
  notes: fieldSchema,
  stops: z.array(
    z.object({
      type: z.enum(['PICKUP', 'DELIVERY']),
      facilityName: fieldSchema,
      address: fieldSchema,
      appointment: fieldSchema,
      referenceNumber: fieldSchema,
      instructions: fieldSchema,
    }),
  ),
});

const fieldJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'confidence'],
  properties: {
    value: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: Object.values(ExtractionConfidence) },
  },
} as const;

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'brokerName',
    'brokerContactName',
    'brokerContactPhone',
    'brokerContactEmail',
    'brokerLoadNumber',
    'rate',
    'commodity',
    'weight',
    'pieces',
    'equipmentType',
    'temperatureRequirements',
    'specialInstructions',
    'detentionTerms',
    'layoverTerms',
    'tonuTerms',
    'lumperInstructions',
    'trackingRequirements',
    'podRequirements',
    'invoicingInstructions',
    'billingEmail',
    'billingAddress',
    'factoringInformation',
    'requiredDocuments',
    'notes',
    'stops',
  ],
  properties: {
    brokerName: fieldJsonSchema,
    brokerContactName: fieldJsonSchema,
    brokerContactPhone: fieldJsonSchema,
    brokerContactEmail: fieldJsonSchema,
    brokerLoadNumber: fieldJsonSchema,
    rate: fieldJsonSchema,
    commodity: fieldJsonSchema,
    weight: fieldJsonSchema,
    pieces: fieldJsonSchema,
    equipmentType: fieldJsonSchema,
    temperatureRequirements: fieldJsonSchema,
    specialInstructions: fieldJsonSchema,
    detentionTerms: fieldJsonSchema,
    layoverTerms: fieldJsonSchema,
    tonuTerms: fieldJsonSchema,
    lumperInstructions: fieldJsonSchema,
    trackingRequirements: fieldJsonSchema,
    podRequirements: fieldJsonSchema,
    invoicingInstructions: fieldJsonSchema,
    billingEmail: fieldJsonSchema,
    billingAddress: fieldJsonSchema,
    factoringInformation: fieldJsonSchema,
    requiredDocuments: fieldJsonSchema,
    notes: fieldJsonSchema,
    stops: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type',
          'facilityName',
          'address',
          'appointment',
          'referenceNumber',
          'instructions',
        ],
        properties: {
          type: { type: 'string', enum: ['PICKUP', 'DELIVERY'] },
          facilityName: fieldJsonSchema,
          address: fieldJsonSchema,
          appointment: fieldJsonSchema,
          referenceNumber: fieldJsonSchema,
          instructions: fieldJsonSchema,
        },
      },
    },
  },
} as const;

const prompt = `Extract the rate confirmation into the requested JSON schema. Do not infer values that are absent from the document. Use NOT_FOUND with null for missing values; HIGH only for explicitly stated values, MEDIUM for a clear but partially ambiguous value, and LOW for uncertain OCR. Preserve relevant units and currency in the value text. Extract broker contacts, financial terms, all operating requirements, billing/factoring details, and all pickup/delivery facilities. Classify every facility as PICKUP or DELIVERY.`;

@Injectable()
export class GeminiRateConfirmationAiProvider implements RateConfirmationAiProvider {
  readonly name = 'gemini';
  readonly model = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

  async extract(input: RateConfirmationExtractionInput): Promise<RateConfirmationExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey === undefined || apiKey.length === 0) {
      throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is gemini.');
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: this.model,
        input: [
          { type: 'text', text: prompt },
          {
            type: 'document',
            data: input.contents.toString('base64'),
            mime_type: input.mimeType,
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: responseSchema,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
    }

    const payload: unknown = await response.json();
    const outputText = this.readOutputText(payload);

    return rateConfirmationExtractionSchema.parse(JSON.parse(outputText));
  }

  private readOutputText(payload: unknown): string {
    if (typeof payload !== 'object' || payload === null) {
      return JSON.stringify(payload);
    }

    if ('output_text' in payload && typeof payload.output_text === 'string') {
      return payload.output_text;
    }

    if (!('steps' in payload) || !Array.isArray(payload.steps)) {
      return JSON.stringify(payload);
    }

    for (const step of payload.steps) {
      if (
        typeof step !== 'object' ||
        step === null ||
        !('type' in step) ||
        step.type !== 'model_output' ||
        !('content' in step) ||
        !Array.isArray(step.content)
      ) {
        continue;
      }

      for (const content of step.content) {
        if (
          typeof content === 'object' &&
          content !== null &&
          'text' in content &&
          typeof content.text === 'string'
        ) {
          return content.text;
        }
      }
    }

    return JSON.stringify(payload);
  }
}
