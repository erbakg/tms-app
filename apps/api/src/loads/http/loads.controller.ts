import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { z } from 'zod';

import { LoadService } from '../application/load.service.js';
import type { Load } from '../application/load.service.js';

const createLoadDraftSchema = z.object({
  brokerLoadNumber: z.string().trim().min(1).max(100).optional(),
});

@Controller('loads')
export class LoadsController {
  constructor(@Inject(LoadService) private readonly loadService: LoadService) {}

  @Post()
  createDraft(@Body() body: unknown): Load {
    const parsed = createLoadDraftSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_LOAD_DRAFT',
        issues: parsed.error.issues,
      });
    }

    return this.loadService.createDraft(parsed.data);
  }
}
