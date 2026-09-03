import { afterEach, describe, expect, it, vi } from 'vitest';

import { GeminiRateConfirmationAiProvider } from './gemini-rate-confirmation-ai.provider.js';

const validOutput = {
  brokerName: { value: 'Example Broker', confidence: 'HIGH' },
  brokerLoadNumber: { value: 'BR-42', confidence: 'HIGH' },
  rate: { value: '$1,000.00', confidence: 'HIGH' },
  commodity: { value: null, confidence: 'NOT_FOUND' },
  weight: { value: null, confidence: 'NOT_FOUND' },
  equipmentType: { value: null, confidence: 'NOT_FOUND' },
  specialInstructions: { value: null, confidence: 'NOT_FOUND' },
  stops: [],
};

const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.GEMINI_API_KEY = originalApiKey;
  process.env.GEMINI_MODEL = originalModel;
});

describe('GeminiRateConfirmationAiProvider', () => {
  it('sends a document as base64 and validates Gemini structured output', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'test-model';
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ output_text: JSON.stringify(validOutput) }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiRateConfirmationAiProvider();
    await expect(
      provider.extract({
        filename: 'rate confirmation.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.from('document'),
      }),
    ).resolves.toEqual(validOutput);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
    expect(request.body).toContain(Buffer.from('document').toString('base64'));
    expect(request.body).not.toContain('test-key');
  });

  it('fails clearly when the key is absent or Gemini returns an error', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      new GeminiRateConfirmationAiProvider().extract({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).rejects.toThrow('GEMINI_API_KEY');

    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('quota exceeded', { status: 429 })),
    );
    await expect(
      new GeminiRateConfirmationAiProvider().extract({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).rejects.toThrow('Gemini request failed (429)');
  });

  it('accepts the direct JSON body returned by the REST API', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(validOutput))),
    );

    await expect(
      new GeminiRateConfirmationAiProvider().extract({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).resolves.toEqual(validOutput);
  });

  it('reads text from an interaction model-output step', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: 'completed',
              steps: [
                { type: 'thought' },
                {
                  type: 'model_output',
                  content: [{ type: 'text', text: JSON.stringify(validOutput) }],
                },
              ],
            }),
          ),
      ),
    );

    await expect(
      new GeminiRateConfirmationAiProvider().extract({
        filename: 'rate.pdf',
        mimeType: 'application/pdf',
        contents: Buffer.alloc(0),
      }),
    ).resolves.toEqual(validOutput);
  });
});
