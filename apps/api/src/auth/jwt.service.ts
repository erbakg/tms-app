import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import type { AuthenticatedUser } from './auth.types.js';
import { UserRole } from './auth.types.js';

const payloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(UserRole),
  exp: z.number().int().positive(),
});

@Injectable()
export class JwtService {
  sign(user: AuthenticatedUser): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1_000) + this.expiresInSeconds,
    });
    const unsignedToken = `${header}.${payload}`;

    return `${unsignedToken}.${this.signValue(unsignedToken)}`;
  }

  verify(token: string): AuthenticatedUser | null {
    const [header, payload, signature, ...rest] = token.split('.');

    if (
      header === undefined ||
      payload === undefined ||
      signature === undefined ||
      rest.length > 0
    ) {
      return null;
    }

    const expectedSignature = this.signValue(`${header}.${payload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const parsed = payloadSchema.parse(
        JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
      );

      if (parsed.exp <= Math.floor(Date.now() / 1_000)) {
        return null;
      }

      return { id: parsed.sub, email: parsed.email, role: parsed.role };
    } catch {
      return null;
    }
  }

  private signValue(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private get secret(): string {
    const secret = process.env.AUTH_JWT_SECRET;

    if (secret === undefined || secret.length < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 characters.');
    }

    return secret;
  }

  private get expiresInSeconds(): number {
    return Number(process.env.AUTH_JWT_EXPIRES_IN_SECONDS ?? 28_800);
  }
}
