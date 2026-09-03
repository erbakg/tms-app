import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { IS_PUBLIC, REQUIRED_ROLES } from './auth.decorators.js';
import { JwtService } from './jwt.service.js';
import type { AuthenticatedUser, UserRole } from './auth.types.js';

type RequestWithUser = FastifyRequest & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const user = token === undefined ? null : this.jwt.verify(token);

    if (user === null) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED' });
    }

    request.user = user;
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles === undefined || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user !== undefined && requiredRoles.includes(request.user.role);
  }
}
