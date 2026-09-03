import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { DOCUMENT_REPOSITORY, DocumentService } from './application/document.service.js';
import { LOAD_REPOSITORY, LoadService } from './application/load.service.js';
import { STOP_REPOSITORY, StopService } from './application/stop.service.js';
import { DocumentsController } from './http/documents.controller.js';
import { LoadsController } from './http/loads.controller.js';
import { StopsController } from './http/stops.controller.js';
import { PrismaDocumentRepository } from './infrastructure/prisma-document.repository.js';
import { PrismaLoadRepository } from './infrastructure/prisma-load.repository.js';
import { PrismaStopRepository } from './infrastructure/prisma-stop.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [LoadsController, StopsController, DocumentsController],
  providers: [
    LoadService,
    StopService,
    DocumentService,
    {
      provide: LOAD_REPOSITORY,
      useClass: PrismaLoadRepository,
    },
    {
      provide: STOP_REPOSITORY,
      useClass: PrismaStopRepository,
    },
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: PrismaDocumentRepository,
    },
  ],
})
export class LoadsModule {}
