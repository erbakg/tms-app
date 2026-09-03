import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard, RolesGuard } from './auth.guards.js';
import { AUTH_USER_REPOSITORY, AuthService } from './auth.service.js';
import { JwtService } from './jwt.service.js';
import { PasswordService } from './password.service.js';
import { PrismaAuthUserRepository } from './prisma-auth-user.repository.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    PasswordService,
    { provide: AUTH_USER_REPOSITORY, useClass: PrismaAuthUserRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtService],
})
export class AuthModule {}
