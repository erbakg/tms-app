import { describe, expect, it } from 'vitest';

import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  it('hashes and verifies a password without accepting a different one', async () => {
    const service = new PasswordService();
    const hash = await service.hash('correct horse battery staple');

    await expect(service.verify('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(service.verify('wrong password', hash)).resolves.toBe(false);
    await expect(service.verify('correct horse battery staple', 'invalid')).resolves.toBe(false);
  });
});
