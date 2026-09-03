import { afterEach, describe, expect, it } from 'vitest';

import { JwtService } from './jwt.service.js';

const originalSecret = process.env.AUTH_JWT_SECRET;

afterEach(() => {
  process.env.AUTH_JWT_SECRET = originalSecret;
});

describe('JwtService', () => {
  it('signs and verifies an authenticated user', () => {
    process.env.AUTH_JWT_SECRET = 'a-test-secret-that-is-longer-than-thirty-two-characters';
    const service = new JwtService();
    const token = service.sign({
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      email: 'dispatcher@example.test',
      role: 'DISPATCHER',
    });

    expect(service.verify(token)).toEqual({
      id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
      email: 'dispatcher@example.test',
      role: 'DISPATCHER',
    });
    expect(service.verify(`${token}x`)).toBeNull();
  });

  it('requires a sufficiently long signing secret', () => {
    process.env.AUTH_JWT_SECRET = 'short';

    expect(() =>
      new JwtService().sign({
        id: '91e7d340-b142-4ca0-96d8-4f5b41c89887',
        email: 'dispatcher@example.test',
        role: 'DISPATCHER',
      }),
    ).toThrow('AUTH_JWT_SECRET');
  });
});
