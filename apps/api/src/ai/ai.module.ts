import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AiQueueService } from './ai-queue.service.js';
import { AiWorkerService } from './ai-worker.service.js';
import { EXTRACTION_PROCESSING_REPOSITORY, ExtractionProcessor } from './extraction-processor.js';
import { EXTRACTION_REPOSITORY, ExtractionService } from './extraction.service.js';
import { GeminiRateConfirmationAiProvider } from './gemini-rate-confirmation-ai.provider.js';
import { MockRateConfirmationAiProvider } from './mock-rate-confirmation-ai.provider.js';
import { PrismaExtractionRepository } from './prisma-extraction.repository.js';
import { AI_EXTRACTION_QUEUE } from './queue.contract.js';
import { RATE_CONFIRMATION_AI_PROVIDER } from './rate-confirmation-ai.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    AiQueueService,
    AiWorkerService,
    ExtractionProcessor,
    GeminiRateConfirmationAiProvider,
    MockRateConfirmationAiProvider,
    {
      provide: AI_EXTRACTION_QUEUE,
      useExisting: AiQueueService,
    },
    ExtractionService,
    {
      provide: EXTRACTION_REPOSITORY,
      useClass: PrismaExtractionRepository,
    },
    {
      provide: EXTRACTION_PROCESSING_REPOSITORY,
      useExisting: EXTRACTION_REPOSITORY,
    },
    {
      provide: RATE_CONFIRMATION_AI_PROVIDER,
      useFactory: (
        geminiProvider: GeminiRateConfirmationAiProvider,
        mockProvider: MockRateConfirmationAiProvider,
      ) => (process.env.AI_PROVIDER === 'gemini' ? geminiProvider : mockProvider),
      inject: [GeminiRateConfirmationAiProvider, MockRateConfirmationAiProvider],
    },
  ],
  exports: [AiWorkerService, ExtractionService],
})
export class AiModule {}
