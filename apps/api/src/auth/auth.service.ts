import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthUser, AuthenticatedUser, DirectoryUser, UserRole } from './auth.types.js';
import { JwtService } from './jwt.service.js';
import { PasswordService } from './password.service.js';

export interface AuthUserRepository {
  create(input: Omit<AuthUser, 'id'>): Promise<AuthUser>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findByRole(role: UserRole): Promise<DirectoryUser[]>;
}

export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async createUser(input: {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
  }): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();
    if ((await this.users.findByEmail(email)) !== null) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });
    }

    const user = await this.users.create({
      email,
      fullName: input.fullName.trim(),
      passwordHash: await this.passwords.hash(input.password),
      role: input.role,
    });

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());

    if (user === null || !(await this.passwords.verify(password, user.passwordHash))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    const authenticatedUser = { id: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign(authenticatedUser), user: authenticatedUser };
  }

  listUsersByRole(role: UserRole): Promise<DirectoryUser[]> {
    return this.users.findByRole(role);
  }
}
