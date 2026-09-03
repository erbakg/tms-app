import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { Roles } from '../../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import { DRIVER_VISIBLE_FIELDS, LoadService } from '../application/load.service.js';
import type { DriverLoad } from '../application/load.service.js';

type AuthenticatedRequest = FastifyRequest & { user: AuthenticatedUser };

export type DriverLoadView = Pick<DriverLoad, 'id' | 'internalLoadId' | 'status' | 'stops'> &
  Partial<Pick<DriverLoad, (typeof DRIVER_VISIBLE_FIELDS)[number]>>;

@Roles('DRIVER')
@Controller('driver/loads')
export class DriverLoadsController {
  constructor(@Inject(LoadService) private readonly loadService: LoadService) {}

  @Get()
  async findAssigned(@Req() request: AuthenticatedRequest): Promise<DriverLoadView[]> {
    const loads = await this.loadService.findAssignedToDriver(request.user.id);
    return loads.map(projectDriverLoad);
  }
}

export const projectDriverLoad = (load: DriverLoad): DriverLoadView => {
  const visibleFields = new Set(
    load.fieldVisibility.filter((item) => item.visibleToDriver).map((item) => item.field),
  );
  const view: DriverLoadView = {
    id: load.id,
    internalLoadId: load.internalLoadId,
    status: load.status,
    stops: load.stops,
  };

  for (const field of DRIVER_VISIBLE_FIELDS) {
    if (visibleFields.has(field) && load[field] !== undefined) {
      view[field] = load[field];
    }
  }

  return view;
};
