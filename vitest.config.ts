import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['scripts/**/*.test.ts', 'extension/src/**/*.test.ts'] },
});
