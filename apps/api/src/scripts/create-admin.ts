import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { AuthService } from '../auth/auth.service.js';

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const bootstrap = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule);
  try {
    const user = await application.get(AuthService).createUser({
      email: required('ADMIN_EMAIL'),
      fullName: required('ADMIN_FULL_NAME'),
      password: required('ADMIN_PASSWORD'),
      role: 'ADMIN',
    });
    process.stdout.write(`Created admin ${user.email}.\n`);
  } finally {
    await application.close();
  }
};

void bootstrap();
