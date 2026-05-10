// R1 TDD — updater.ts
// AC4: isPackaged=false 가드는 index.ts 통합 테스트에서 확인
// AC5: error 이벤트 → 앱 크래시 없음 (console.warn)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron-updater', () => {
  const mockAutoUpdater = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
  };
  return { autoUpdater: mockAutoUpdater };
});

vi.mock('electron', () => {
  const mockSend = vi.fn();
  const mockWin = { webContents: { send: mockSend } };
  const BrowserWindow = { getAllWindows: vi.fn(() => [mockWin]) };
  const ipcMain = { handle: vi.fn(), removeHandler: vi.fn() };
  const shell = { openExternal: vi.fn().mockResolvedValue(undefined) };
  return { BrowserWindow, ipcMain, shell, _mockSend: mockSend };
});

import { registerUpdater } from '../../src/main/updater';
import { autoUpdater } from 'electron-updater';
import { ipcMain, shell } from 'electron';

const au = autoUpdater as unknown as {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: ReturnType<typeof vi.fn>;
  checkForUpdates: ReturnType<typeof vi.fn>;
};

const ipc = ipcMain as unknown as {
  handle: ReturnType<typeof vi.fn>;
  removeHandler: ReturnType<typeof vi.fn>;
};

const sh = shell as unknown as { openExternal: ReturnType<typeof vi.fn> };

type ElectronMockModule = { _mockSend: ReturnType<typeof vi.fn> };

function getAutoUpdaterHandler(event: string): ((arg: unknown) => void) | undefined {
  const call = au.on.mock.calls.find(([e]: [string]) => e === event);
  return call ? (call[1] as (arg: unknown) => void) : undefined;
}

function getIpcHandler(channel: string): ((event: unknown) => Promise<void>) | undefined {
  const call = ipc.handle.mock.calls.find(([ch]: [string]) => ch === channel);
  return call ? (call[1] as (event: unknown) => Promise<void>) : undefined;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  // autoDownload/autoInstallOnAppQuit 기본값 리셋
  au.autoDownload = true;
  au.autoInstallOnAppQuit = true;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('registerUpdater — 설정', () => {
  it('autoDownload = false로 설정', async () => {
    await registerUpdater();
    expect(au.autoDownload).toBe(false);
  });

  it('autoInstallOnAppQuit = false로 설정', async () => {
    await registerUpdater();
    expect(au.autoInstallOnAppQuit).toBe(false);
  });
});

describe('registerUpdater — 5초 딜레이', () => {
  it('즉시 checkForUpdates 미호출', async () => {
    await registerUpdater();
    expect(au.checkForUpdates).not.toHaveBeenCalled();
  });

  it('5초 경과 후 checkForUpdates 호출', async () => {
    await registerUpdater();
    vi.advanceTimersByTime(5000);
    expect(au.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('4.9초 경과 시 checkForUpdates 미호출', async () => {
    await registerUpdater();
    vi.advanceTimersByTime(4999);
    expect(au.checkForUpdates).not.toHaveBeenCalled();
  });
});

describe('registerUpdater — update-available 이벤트', () => {
  it('update-available 리스너 등록', async () => {
    await registerUpdater();
    expect(getAutoUpdaterHandler('update-available')).toBeDefined();
  });

  it('update-available 발화 → 모든 윈도우에 api:updateAvailable + 버전 전송', async () => {
    await registerUpdater();
    const handler = getAutoUpdaterHandler('update-available');
    handler?.({ version: '1.2.3' });

    const mod = await import('electron') as unknown as ElectronMockModule;
    expect(mod._mockSend).toHaveBeenCalledWith('api:updateAvailable', '1.2.3');
  });
});

describe('registerUpdater — error 핸들링 (AC5)', () => {
  it('error 이벤트 발화 시 앱 크래시 없음 (console.warn)', async () => {
    await registerUpdater();
    const handler = getAutoUpdaterHandler('error');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => handler?.({ message: 'network error' })).not.toThrow();
    warnSpy.mockRestore();
  });
});

describe('registerUpdater — api:updateOpenReleases 핸들러', () => {
  it('api:updateOpenReleases IPC 핸들러 등록', () => {
    void registerUpdater(); // IPC handler registers before first await
    expect(getIpcHandler('api:updateOpenReleases')).toBeDefined();
  });

  it('api:updateOpenReleases 호출 → shell.openExternal(releases URL)', async () => {
    await registerUpdater();
    const handler = getIpcHandler('api:updateOpenReleases');
    await handler?.(null);
    expect(sh.openExternal).toHaveBeenCalledWith(
      'https://github.com/bluemirr5/md_dolphin/releases',
    );
  });
});

describe('registerUpdater — dispose', () => {
  it('dispose 호출 시 ipcMain.removeHandler 실행', async () => {
    const dispose = await registerUpdater();
    dispose();
    expect(ipc.removeHandler).toHaveBeenCalledWith('api:updateOpenReleases');
  });
});
