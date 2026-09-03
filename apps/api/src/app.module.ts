import { Module } from '@nestjs/common';

import { AiModule } from './ai/ai.module.js';
import { HealthController } from './health/health.controller.js';
import { LoadsModule } from './loads/loads.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [AiModule, StorageModule, LoadsModule],
  controllers: [HealthController],
})
export class AppModule {}
