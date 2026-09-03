import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AiWorkerService } from './ai/ai-worker.service.js';
import { AppModule } from './app.module.js';

const bootstrap = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule);
  const worker = application.get(AiWorkerService);
  await worker.start();

  const shutdown = async (): Promise<void> => {
    await application.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  Logger.log('Worker is listening for extraction jobs.', 'Bootstrap');
};

void bootstrap();
