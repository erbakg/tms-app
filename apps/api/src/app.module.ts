import { Module } from '@nestjs/common';

import { HealthController } from './health/health.controller.js';
import { LoadsModule } from './loads/loads.module.js';

@Module({
  imports: [LoadsModule],
  controllers: [HealthController],
})
export class AppModule {}
