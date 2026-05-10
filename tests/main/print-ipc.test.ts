// 사후 테스트 — print-ipc.ts
// CR9-4: path-guard 검증이 homedir() 기반으로 동작하는지 확인
// - 홈 디렉터리 내부 경로 → PDF 저장 성공
// - /etc/passwd.pdf 등 외부 경로 → 거부 + showErrorBox 호출
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { homedir } from 'node:os';

// path-guard mock — 경로 검증을 vi.fn으로 대체 (실제 fs 호출 없음)
vi.mock('../../src/main/path-guard', () => {
  return {
    assertWithinBaseDir: vi.fn(),
  };
});

vi.mock('electron', () => {
  const mockWin = {
    webContents: {
      print: vi.fn(),
      printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf-data')),
    },
  };

  const BrowserWindow = {
    fromWebContents: vi.fn(() => mockWin),
  };

  const dialog = {
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: vi.fn(),
  };

  const ipcMain = {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  };

  return { BrowserWindow, dialog, ipcMain };
});

// node:fs mock — constants를 실제 값(0으로 폴백)으로 정의하여 path-guard.ts 로드 허용
// path-guard는 mock됐지만 모듈 그래프 로드 시 node:fs가 필요함
vi.mock('node:fs', () => {
  // O_NOFOLLOW macOS 값: 0x00100000 = 1048576. mock 환경에서는 0 폴백으로도 충분
  return {
    constants: { O_NOFOLLOW: 0, O_RDONLY: 0 },
    promises: {
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { registerPrintIpc } from '../../src/main/print-ipc';
import { ipcMain, dialog } from 'electron';
import { assertWithinBaseDir } from '../../src/main/path-guard';

const mockIpcMain = ipcMain as unknown as {
  handle: ReturnType<typeof vi.fn>;
  removeHandler: ReturnType<typeof vi.fn>;
};

const mockDialog = dialog as unknown as {
  showSaveDialog: ReturnType<typeof vi.fn>;
  showMessageBox: ReturnType<typeof vi.fn>;
  showErrorBox: ReturnType<typeof vi.fn>;
};

const mockAssertWithinBaseDir = assertWithinBaseDir as ReturnType<typeof vi.fn>;

function getHandler(channel: string): (event: { sender: unknown }) => Promise<void> {
  const calls = mockIpcMain.handle.mock.calls;
  const found = calls.find(([ch]) => ch === channel);
  if (!found) throw new Error(`Handler for ${channel} not registered`);
  return found[1] as (event: { sender: unknown }) => Promise<void>;
}

const fakeEvent = { sender: {} };

beforeEach(() => {
  vi.clearAllMocks();
  registerPrintIpc();
});

describe('print-ipc — 핸들러 등록', () => {
  it('view:print 핸들러가 등록된다', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith('view:print', expect.any(Function));
  });

  it('view:save-pdf 핸들러가 등록된다', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith('view:save-pdf', expect.any(Function));
  });
});

describe('print-ipc — PDF 저장 path-guard', () => {
  it('홈 디렉터리 내부 경로는 assertWithinBaseDir를 homedir()로 호출한다', async () => {
    const homeDir = homedir();
    const safePath = `${homeDir}/Downloads/document.pdf`;

    mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: safePath });
    mockAssertWithinBaseDir.mockResolvedValue(undefined); // 통과

    const handler = getHandler('view:save-pdf');
    await handler(fakeEvent);

    expect(mockAssertWithinBaseDir).toHaveBeenCalledWith(safePath, homeDir);
  });

  it('/etc/passwd.pdf 경로는 assertWithinBaseDir가 throw → showErrorBox 호출', async () => {
    const maliciousPath = '/etc/passwd.pdf';

    mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: maliciousPath });
    mockAssertWithinBaseDir.mockRejectedValue(new Error('OUTSIDE_BASE_DIR'));

    const handler = getHandler('view:save-pdf');
    await handler(fakeEvent);

    expect(mockDialog.showErrorBox).toHaveBeenCalledWith(
      'PDF 저장 실패',
      expect.stringContaining('허용되지 않는 경로'),
    );
  });

  it('/etc/passwd.pdf 거부 시 printToPDF가 호출되지 않는다', async () => {
    const maliciousPath = '/etc/passwd.pdf';
    const { BrowserWindow } = await import('electron');
    const mockWinFromCall = (BrowserWindow.fromWebContents as ReturnType<typeof vi.fn>)() as {
      webContents: { printToPDF: ReturnType<typeof vi.fn> };
    };

    mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: maliciousPath });
    mockAssertWithinBaseDir.mockRejectedValue(new Error('OUTSIDE_BASE_DIR'));

    const handler = getHandler('view:save-pdf');
    await handler(fakeEvent);

    expect(mockWinFromCall.webContents.printToPDF).not.toHaveBeenCalled();
  });

  it('취소 시 assertWithinBaseDir가 호출되지 않는다', async () => {
    mockDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });

    const handler = getHandler('view:save-pdf');
    await handler(fakeEvent);

    expect(mockAssertWithinBaseDir).not.toHaveBeenCalled();
  });
});
