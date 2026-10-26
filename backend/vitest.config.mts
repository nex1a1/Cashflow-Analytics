import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Service tests share one DB_PATH, so test files run one at a time (each still in its own fork).
    fileParallelism: false,
  },
});
