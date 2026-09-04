export const UserRole = {
  ADMIN: 'ADMIN',
  ACCOUNTING: 'ACCOUNTING',
  DISPATCHER: 'DISPATCHER',
  DRIVER: 'DRIVER',
  SAFETY: 'SAFETY',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthUser extends AuthenticatedUser {
  fullName: string;
  passwordHash: string;
}

export interface DirectoryUser extends AuthenticatedUser {
  fullName: string;
}
