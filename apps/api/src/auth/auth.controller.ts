import { BadRequestException, Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';

import { Public } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

@Public()
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_LOGIN', issues: parsed.error.issues });
    }

    return this.authService.login(parsed.data.email, parsed.data.password);
  }
}
