import { describe, expect, it } from 'vitest';

import { RateConfirmationIntakeService } from './rate-confirmation-intake.service.js';

describe('RateConfirmationIntakeService', () => {
  it('creates a draft and attaches the uploaded rate confirmation', async () => {
    const createDraft = async (input: { brokerLoadNumber?: string }) => ({
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      brokerLoadNumber: input.brokerLoadNumber ?? null,
      internalLoadId: null,
      status: 'DRAFT' as const,
      createdAt: new Date(),
    });
    const uploadRateConfirmation = async (loadId: string) => ({
      id: 'ed081ab1-77a8-4866-bf3a-aa6ce51ad757',
      loadId,
      kind: 'RATE_CONFIRMATION' as const,
      version: 1,
      filename: 'rate.pdf',
      mimeType: 'application/pdf',
      storageKey: 'loads/rate.pdf',
      isCurrent: true,
      createdAt: new Date(),
    });
    const service = new RateConfirmationIntakeService(
      { createDraft } as never,
      { uploadRateConfirmation } as never,
    );

    await expect(
      service.createDraftFromRateConfirmation({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.from('document'),
        brokerLoadNumber: 'BR-42',
      }),
    ).resolves.toMatchObject({
      load: { brokerLoadNumber: 'BR-42', status: 'DRAFT' },
      document: { loadId: '91e7d340-b142-4ca0-96d8-4f5b41c89887', version: 1 },
    });
  });
});
