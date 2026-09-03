import multipart from '@fastify/multipart';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const configureApp = async (app: NestFastifyApplication): Promise<void> => {
  await app
    .getHttpAdapter()
    .getInstance()
    .register(multipart, {
      limits: {
        files: 1,
        fileSize: MAX_DOCUMENT_SIZE_BYTES,
      },
    });
};
