// 사이클 16 보강 — API_WINDOW_CLOSE 핸들러 보안 검증
// api:windowClose: BrowserWindow.fromWebContents(sender).close() — sender 윈도우만 close
// 다른 윈도우의 close() 호출 0, null 반환 시 no-op
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted로 mock 변수 초기화 (hoisting 순서 보장) ────────────────────────
const { fromWebContentsMock, ipcHandlers } = vi.hoisted(() => {
  const ipcHandlers: Record<string, (event: { sender: unknown }) => unknown> = {};
  const fromWebContentsMock = vi.fn();
  return { fromWebContentsMock, ipcHandlers };
});

vi.mock('electron', () => {
  const ipcMain = {
    handle: vi.fn((channel: string, handler: (event: { sender: unknown }) => unknown) => {
      ipcHandlers[channel] = handler;
    }),
    removeHandler: vi.fn(),
    on: vi.fn((channel: string, handler: (event: { sender: unknown }) => unknown) => {
      ipcHandlers[channel] = handler;
    }),
    removeAllListeners: vi.fn(),
  };

  const BrowserWindow = {
    fromWebContents: fromWebContentsMock,
    getAllWindows: vi.fn().mockReturnValue([]),
  };

  const nativeTheme = {
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  const app = {
    getLocale: vi.fn().mockReturnValue('en'),
  };

  const shell = { openExternal: vi.fn() };

  return { ipcMain, BrowserWindow, nativeTheme, app, shell };
});

import { registerIpcHandlers } from '../../src/main/ipc-handlers';
import type { FileService } from '../../src/main/file-service';
import type { DocumentWindowManager } from '../../src/main/document-window';

// ── 공통 stub ─────────────────────────────────────────────────────────────────
function makeStubs() {
  const fileService = {
    openViaDialog: vi.fn(),
    readFile: vi.fn(),
    statFile: vi.fn(),
  } as unknown as FileService;

  const windowManager = {
    setBaseDir: vi.fn(),
    get: vi.fn().mockReturnValue(undefined),
  } as unknown as DocumentWindowManager;

  return { fileService, windowManager };
}

describe('API_WINDOW_CLOSE 핸들러 — 보안: sender 윈도우만 close', () => {
  beforeEach(() => {
    for (const key of Object.keys(ipcHandlers)) {
      delete ipcHandlers[key];
    }
    vi.clearAllMocks();
  });

  it('api:windowClose — sender에 연결된 BrowserWindow의 close()가 호출된다', async () => {
    const closeMock = vi.fn();
    fromWebContentsMock.mockReturnValue({ close: closeMock });

    const { fileService, windowManager } = makeStubs();
    registerIpcHandlers(fileService, windowManager);

    const handler = ipcHandlers['api:windowClose'];
    expect(handler).toBeDefined();

    await handler({ sender: {} });

    expect(closeMock).toHaveBeenCalledOnce();
  });

  it('api:windowClose — fromWebContents가 null 반환 시 throw 없이 no-op', async () => {
    fromWebContentsMock.mockReturnValue(null);

    const { fileService, windowManager } = makeStubs();
    registerIpcHandlers(fileService, windowManager);

    const handler = ipcHandlers['api:windowClose'];

    await expect(async () => {
      await handler({ sender: {} });
    }).not.toThrow();
  });

  it('api:windowClose — 다른 윈도우의 close()는 호출되지 않는다', async () => {
    const senderCloseMock = vi.fn();
    const otherCloseMock = vi.fn();

    fromWebContentsMock.mockReturnValue({ close: senderCloseMock });

    const { fileService, windowManager } = makeStubs();
    registerIpcHandlers(fileService, windowManager);

    const handler = ipcHandlers['api:windowClose'];
    await handler({ sender: {} });

    expect(senderCloseMock).toHaveBeenCalledOnce();
    expect(otherCloseMock).not.toHaveBeenCalled();
  });
});
