import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 1 minute per test
    hookTimeout: 120000, // 2 minutes for setup/teardown
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to respect rate limits
      },
    },
    include: ['e2e/tests/**/*.e2e.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    globalSetup: ['./e2e/setup/globalSetup.ts'],
    setupFiles: ['./e2e/setup/testEnvironment.ts'],
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@e2e': path.resolve(__dirname, '.'),
    },
  },
});
