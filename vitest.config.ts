import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // 기본 환경은 node; tests/markdown/** + tests/components/**는 jsdom으로 오버라이드
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/markdown/**', 'jsdom'],
      ['tests/components/**', 'jsdom'],
    ],
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/markdown/setup.ts'],
    coverage: { reporter: ['text', 'html'], provider: 'v8' },
  },
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') },
  },
});
