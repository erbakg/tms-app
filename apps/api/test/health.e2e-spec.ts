import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { configureApp } from '../src/app.config.js';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtService } from '../src/auth/jwt.service.js';

describe('GET /health', () => {
  let app: NestFastifyApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('returns the API health status', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('creates a load draft through the HTTP API', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const headers = await dispatcherHeaders(app);

    const response = await app.inject({
      method: 'POST',
      url: '/loads',
      headers,
      payload: { brokerLoadNumber: '784521' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      brokerLoadNumber: '784521',
      status: 'DRAFT',
      internalLoadId: null,
    });
  });

  it('adds an ordered pickup stop to a draft and returns it with the load', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const headers = await dispatcherHeaders(app);

    const draftResponse = await app.inject({
      method: 'POST',
      url: '/loads',
      headers,
      payload: { brokerLoadNumber: '784521' },
    });
    const draft = draftResponse.json<{ id: string }>();

    const createdStopResponse = await app.inject({
      method: 'POST',
      url: `/loads/${draft.id}/stops`,
      headers,
      payload: {
        type: 'PICKUP',
        facilityName: 'Acme Warehouse',
        addressLine1: '101 Main Street',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201',
        referenceNumber: 'PU-1098',
        instructions: 'Check in at gate 3.',
      },
    });

    expect(createdStopResponse.statusCode).toBe(201);
    expect(createdStopResponse.json()).toMatchObject({
      type: 'PICKUP',
      position: 1,
      facilityName: 'Acme Warehouse',
      referenceNumber: 'PU-1098',
    });

    const loadResponse = await app.inject({ method: 'GET', url: `/loads/${draft.id}`, headers });

    expect(loadResponse.statusCode).toBe(200);
    expect(loadResponse.json()).toMatchObject({
      id: draft.id,
      stops: [
        {
          type: 'PICKUP',
          position: 1,
          facilityName: 'Acme Warehouse',
        },
      ],
    });
  });

  it('updates, reorders, and removes stops in a draft', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const headers = await dispatcherHeaders(app);

    const draftResponse = await app.inject({ method: 'POST', url: '/loads', headers, payload: {} });
    const draft = draftResponse.json<{ id: string }>();
    const pickup = (
      await app.inject({
        method: 'POST',
        url: `/loads/${draft.id}/stops`,
        headers,
        payload: { type: 'PICKUP', facilityName: 'First Stop' },
      })
    ).json<{ id: string }>();
    const delivery = (
      await app.inject({
        method: 'POST',
        url: `/loads/${draft.id}/stops`,
        headers,
        payload: { type: 'DELIVERY', facilityName: 'Second Stop' },
      })
    ).json<{ id: string }>();

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/loads/${draft.id}/stops/${pickup.id}`,
      headers,
      payload: { referenceNumber: 'PU-UPDATED' },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({ referenceNumber: 'PU-UPDATED' });

    const reorderResponse = await app.inject({
      method: 'PATCH',
      url: `/loads/${draft.id}/stops/reorder`,
      headers,
      payload: { stopIds: [delivery.id, pickup.id] },
    });
    expect(reorderResponse.statusCode).toBe(200);
    expect(reorderResponse.json()).toMatchObject([
      { id: delivery.id, position: 1 },
      { id: pickup.id, position: 2 },
    ]);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/loads/${draft.id}/stops/${pickup.id}`,
      headers,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const loadResponse = await app.inject({ method: 'GET', url: `/loads/${draft.id}`, headers });
    expect(loadResponse.json()).toMatchObject({
      stops: [{ id: delivery.id, position: 1 }],
    });
  });

  it('keeps both Rate Confirmation versions and marks the latest one current', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app);
    await app.init();
    const headers = await dispatcherHeaders(app);

    const draftResponse = await app.inject({ method: 'POST', url: '/loads', headers, payload: {} });
    const draft = draftResponse.json<{ id: string }>();

    const originalResponse = await app.inject({
      method: 'POST',
      url: `/loads/${draft.id}/documents`,
      headers: { ...headers, 'content-type': 'multipart/form-data; boundary=TestBoundary' },
      payload: multipartPayload('original-rate-confirmation.pdf', 'Original RC'),
    });
    expect(originalResponse.statusCode).toBe(201);
    expect(originalResponse.json()).toMatchObject({
      kind: 'RATE_CONFIRMATION',
      version: 1,
      isCurrent: true,
    });

    const revisedResponse = await app.inject({
      method: 'POST',
      url: `/loads/${draft.id}/documents`,
      headers: { ...headers, 'content-type': 'multipart/form-data; boundary=TestBoundary' },
      payload: multipartPayload('revised-rate-confirmation.pdf', 'Revised RC'),
    });
    expect(revisedResponse.statusCode).toBe(201);
    expect(revisedResponse.json()).toMatchObject({
      kind: 'RATE_CONFIRMATION',
      version: 2,
      isCurrent: true,
    });

    const revisedDocument = revisedResponse.json<{ id: string }>();
    const extractionResponse = await app.inject({
      method: 'GET',
      url: `/loads/${draft.id}/documents/${revisedDocument.id}/extraction`,
      headers,
    });
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.json()).toMatchObject({
      documentId: revisedDocument.id,
      status: 'PENDING',
      provider: 'mock',
    });

    const documentsResponse = await app.inject({
      method: 'GET',
      url: `/loads/${draft.id}/documents`,
      headers,
    });
    expect(documentsResponse.statusCode).toBe(200);
    expect(documentsResponse.json()).toMatchObject([
      { version: 1, isCurrent: false },
      { version: 2, isCurrent: true },
    ]);
  });
});

const dispatcherHeaders = async (
  app: NestFastifyApplication,
): Promise<{ authorization: string }> => {
  const authService = app.get(AuthService);
  const jwt = app.get(JwtService);
  const user = await authService.createUser({
    email: `dispatcher-${randomUUID()}@example.test`,
    fullName: 'Test Dispatcher',
    password: 'test-password',
    role: 'DISPATCHER',
  });

  return { authorization: `Bearer ${jwt.sign(user)}` };
};

const multipartPayload = (filename: string, contents: string): Buffer =>
  Buffer.from(
    [
      '--TestBoundary',
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: application/pdf',
      '',
      contents,
      '--TestBoundary--',
      '',
    ].join('\r\n'),
  );
