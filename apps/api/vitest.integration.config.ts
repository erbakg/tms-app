import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.int-spec.ts'],
    setupFiles: ['./test/setup-integration.ts'],
  },
});
