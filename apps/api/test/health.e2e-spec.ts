import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';

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

    const response = await app.inject({
      method: 'POST',
      url: '/loads',
      payload: { brokerLoadNumber: '784521' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      brokerLoadNumber: '784521',
      status: 'DRAFT',
      internalLoadId: null,
    });
  });
});
