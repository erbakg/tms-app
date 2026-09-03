import { SetMetadata } from '@nestjs/common';

import type { UserRole } from './auth.types.js';

export const IS_PUBLIC = 'isPublic';
export const REQUIRED_ROLES = 'requiredRoles';

export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_ROLES, roles);
