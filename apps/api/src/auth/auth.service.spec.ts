import { describe, expect, it } from 'vitest';

import { AuthService, type AuthUserRepository } from './auth.service.js';
import type { DirectoryUser } from './auth.types.js';
import { JwtService } from './jwt.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
  it('returns a password-free directory for dispatcher driver assignment', async () => {
    const drivers: DirectoryUser[] = [
      {
        id: 'd1c59e15-9d9f-4cad-86f5-8af5bf968056',
        email: 'alex@example.test',
        fullName: 'Alex Driver',
        role: 'DRIVER',
      },
    ];
    const service = new AuthService(
      {
        create: async () => {
          throw new Error('not used');
        },
        findByEmail: async () => null,
        findByRole: async () => drivers,
      } satisfies AuthUserRepository,
      new PasswordService(),
      new JwtService(),
    );

    await expect(service.listUsersByRole('DRIVER')).resolves.toEqual(drivers);
  });
});
