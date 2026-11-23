import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/algorithms/**'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 90,
      },
    },
  },
});
