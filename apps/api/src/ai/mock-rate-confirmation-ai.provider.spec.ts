import { describe, expect, it } from 'vitest';

import { MockRateConfirmationAiProvider } from './mock-rate-confirmation-ai.provider.js';

describe('MockRateConfirmationAiProvider', () => {
  it('returns an empty structured result for local development', async () => {
    const provider = new MockRateConfirmationAiProvider();

    await expect(
      provider.extract({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).resolves.toMatchObject({
      brokerName: { value: null, confidence: 'NOT_FOUND' },
      stops: [],
    });
  });
});
