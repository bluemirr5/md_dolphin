// bench-ipc-prod-guard.test.ts — 사후: NODE_ENV=production 시 bench IPC 미등록 (CR9-S1)
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp'),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ipcMain } from 'electron';
import { API_BENCH_COLD_START } from '../../src/shared/ipc-channels';

const mockIpcMain = ipcMain as unknown as { handle: ReturnType<typeof vi.fn> };

afterEach(() => {
  vi.clearAllMocks();
  // NODE_ENV 복원
  process.env['NODE_ENV'] = 'test';
});

describe('bench-ipc — production 미노출 (CR9-S1)', () => {
  it('NODE_ENV=production 시 bench:cold-start IPC 핸들러 미등록', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    try {
      // bench-ipc 모듈 재로딩 (환경 변수 변경 반영)
      const { registerBenchIpc } = await import('../../src/main/bench-ipc');
      registerBenchIpc();

      // production에서는 bench:cold-start IPC 미등록
      const coldStartHandled = mockIpcMain.handle.mock.calls.some(
        (args: unknown[]) => args[0] === API_BENCH_COLD_START
      );
      expect(coldStartHandled).toBe(false);
    } finally {
      process.env['NODE_ENV'] = originalEnv;
    }
  });

  it('NODE_ENV=development 시 bench:cold-start IPC 등록', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';

    try {
      vi.resetModules();
      const { registerBenchIpc } = await import('../../src/main/bench-ipc');
      registerBenchIpc();

      const coldStartHandled = mockIpcMain.handle.mock.calls.some(
        (args: unknown[]) => args[0] === API_BENCH_COLD_START
      );
      expect(coldStartHandled).toBe(true);
    } finally {
      process.env['NODE_ENV'] = originalEnv;
      vi.resetModules();
    }
  });
});
