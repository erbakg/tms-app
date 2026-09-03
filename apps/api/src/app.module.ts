import { Module } from '@nestjs/common';

import { HealthController } from './health/health.controller.js';
import { LoadsModule } from './loads/loads.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [StorageModule, LoadsModule],
  controllers: [HealthController],
})
export class AppModule {}
