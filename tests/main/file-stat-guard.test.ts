// CR10-3 회귀: file:stat IPC 핸들러 path-guard 검증
// API_FILE_STAT 핸들러가 baseDir 지정 시 assertWithinBaseDir를 호출하는지 확인.
// traversal 시도 시 OutsideBaseDirError를 throw하여 IPC 호출이 reject되어야 한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── electron mock ─────────────────────────────────────────────────────────────
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  shell: { openExternal: vi.fn() },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    fromWebContents: vi.fn(() => null),
  },
  app: { getLocale: vi.fn(() => 'ko') },
  nativeTheme: { shouldUseDarkColors: false },
}));

// ── fs mock ──────────────────────────────────────────────────────────────────
vi.mock('node:fs', () => ({
  promises: {
    realpath: vi.fn((p: string) => Promise.resolve(p)),
    open: vi.fn().mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) }),
    stat: vi.fn(),
  },
  constants: {
    O_RDONLY: 0,
    O_NOFOLLOW: 256,
  },
}));

// ── theme-service mock ───────────────────────────────────────────────────────
vi.mock('../../src/main/theme-service', () => ({
  getCurrentTheme: vi.fn(() => 'light'),
  watchTheme: vi.fn(() => () => undefined),
}));

import { promises as fs } from 'node:fs';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { ipcMain, BrowserWindow } from 'electron';
import { registerIpcHandlers } from '../../src/main/ipc-handlers';
import { FileService } from '../../src/main/file-service';
import { DocumentWindowManager } from '../../src/main/document-window';
import { OutsideBaseDirError } from '../../src/main/path-guard';
import {
  API_FILE_STAT,
} from '@shared/ipc-channels';

const mockStat = fs.stat as unknown as ReturnType<typeof vi.fn>;
const mockRealpath = fs.realpath as unknown as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockIpcHandle = ipcMain.handle as unknown as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockFromWebContents = BrowserWindow.fromWebContents as unknown as ReturnType<typeof vi.fn>;

/**
 * ipcMain.handle 등록된 핸들러를 채널명으로 조회한다.
 */
function getRegisteredHandler(channel: string): ((...args: unknown[]) => Promise<unknown>) | undefined {
  const found = mockIpcHandle.mock.calls.find(([ch]) => ch === channel);
  if (!found) return undefined;
  return found[1] as (...args: unknown[]) => Promise<unknown>;
}

afterEach(() => {
  vi.clearAllMocks();
  mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
});

describe('file:stat IPC — path-guard 검증 (CR10-3)', () => {
  function setupHandlers(baseDir: string | undefined) {
    const fileService = new FileService();
    const windowManager = new DocumentWindowManager();

    // BrowserWindow mock — win with baseDir
    // DocumentWindowManager.register が window.on('closed') を呼ぶので on mock が必要
    const mockWin = {
      id: 1,
      isDestroyed: vi.fn(() => false),
      on: vi.fn(),
    } as unknown as BrowserWindowType;
    mockFromWebContents.mockReturnValue(mockWin);

    if (baseDir !== undefined) {
      windowManager.register(mockWin, baseDir);
    }

    registerIpcHandlers(fileService, windowManager);

    const handler = getRegisteredHandler(API_FILE_STAT);
    expect(handler).toBeDefined();
    return handler!;
  }

  beforeEach(() => {
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
  });

  it('baseDir 지정 시 baseDir 내부 경로는 stat을 정상 반환한다', async () => {
    const handler = setupHandlers('/base');
    mockStat.mockResolvedValue({ size: 1000 });

    const fakeEvent = { sender: {} } as unknown as Electron.IpcMainInvokeEvent;
    const result = await handler(fakeEvent, '/base/file.md');

    expect(result).toEqual({ size: 1000, tooLarge: false });
  });

  it('baseDir 지정 시 traversal 경로는 OutsideBaseDirError를 throw한다', async () => {
    const handler = setupHandlers('/base');

    const fakeEvent = { sender: {} } as unknown as Electron.IpcMainInvokeEvent;

    await expect(
      handler(fakeEvent, '/base/../etc/passwd'),
    ).rejects.toBeInstanceOf(OutsideBaseDirError);

    // stat은 호출되지 않아야 함 (path-guard에서 차단)
    expect(mockStat).not.toHaveBeenCalled();
  });

  it('baseDir 미지정(최초 열기) 시 path-guard 없이 stat을 호출한다', async () => {
    // baseDir = undefined → 윈도우 미등록
    const fileService = new FileService();
    const windowManager = new DocumentWindowManager();

    // BrowserWindow 없는 상태 (null 반환)
    mockFromWebContents.mockReturnValue(null);

    registerIpcHandlers(fileService, windowManager);

    const handler = getRegisteredHandler(API_FILE_STAT);
    expect(handler).toBeDefined();

    mockStat.mockResolvedValue({ size: 500 });

    const fakeEvent = { sender: {} } as unknown as Electron.IpcMainInvokeEvent;
    const result = await handler!(fakeEvent, '/some/path/file.md');

    expect(result).toEqual({ size: 500, tooLarge: false });
    expect(mockStat).toHaveBeenCalledOnce();
  });
});
