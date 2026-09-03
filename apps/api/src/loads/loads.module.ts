import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { LOAD_REPOSITORY, LoadService } from './application/load.service.js';
import { LoadsController } from './http/loads.controller.js';
import { PrismaLoadRepository } from './infrastructure/prisma-load.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [LoadsController],
  providers: [
    LoadService,
    {
      provide: LOAD_REPOSITORY,
      useClass: PrismaLoadRepository,
    },
  ],
})
export class LoadsModule {}
