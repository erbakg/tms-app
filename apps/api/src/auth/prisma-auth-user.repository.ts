import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from './auth.types.js';
import type { AuthUserRepository } from './auth.service.js';

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(input: Omit<AuthUser, 'id'>): Promise<AuthUser> {
    return this.prisma.user.create({ data: input });
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
