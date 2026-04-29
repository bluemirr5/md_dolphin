import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'], provider: 'v8' },
  },
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') },
  },
});
