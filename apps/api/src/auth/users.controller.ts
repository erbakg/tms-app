import { BadRequestException, Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import { Roles } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import { UserRole } from './auth.types.js';
import type { AuthenticatedUser, DirectoryUser } from './auth.types.js';

const createUserSchema = z.object({
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().min(1).max(200),
  password: z.string().min(12).max(256),
  role: z.enum(UserRole),
});

@Controller('users')
export class UsersController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Roles('ADMIN', 'DISPATCHER')
  @Get()
  async list(@Query('role') role?: string): Promise<DirectoryUser[]> {
    if (role !== UserRole.DRIVER) {
      throw new BadRequestException({ code: 'SUPPORTED_ROLE_REQUIRED' });
    }
    return this.authService.listUsersByRole(role);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: unknown): Promise<AuthenticatedUser> {
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_USER', issues: parsed.error.issues });
    }
    return this.authService.createUser(parsed.data);
  }
}
