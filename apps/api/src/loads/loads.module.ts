import { Module } from '@nestjs/common';

import { LoadService } from './application/load.service.js';
import { LoadsController } from './http/loads.controller.js';

@Module({
  controllers: [LoadsController],
  providers: [LoadService],
})
export class LoadsModule {}
