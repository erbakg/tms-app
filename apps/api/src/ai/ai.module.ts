import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AiQueueService } from './ai-queue.service.js';
import { EXTRACTION_REPOSITORY, ExtractionService } from './extraction.service.js';
import { PrismaExtractionRepository } from './prisma-extraction.repository.js';
import { AI_EXTRACTION_QUEUE } from './queue.contract.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    AiQueueService,
    {
      provide: AI_EXTRACTION_QUEUE,
      useExisting: AiQueueService,
    },
    ExtractionService,
    {
      provide: EXTRACTION_REPOSITORY,
      useClass: PrismaExtractionRepository,
    },
  ],
  exports: [ExtractionService],
})
export class AiModule {}
