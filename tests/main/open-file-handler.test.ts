// R5: open-file-handler
// AC6: ready 이전 큐잉, whenReady 후 focused BrowserWindow webContents.send(API_DOCUMENT_OPENED) 호출
// AC7: process.platform !== 'darwin'이면 no-op
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { API_DOCUMENT_OPENED } from '../../src/shared/ipc-channels';

type OpenFileEvent = { preventDefault: () => void };
type OpenFileCallback = (event: OpenFileEvent, path: string) => void;
type MockAppOn = (event: string, cb: (...args: unknown[]) => void) => void;

// platform 전환을 위한 mock
vi.mock('@shared/platform', () => ({
  isMacOS: vi.fn(),
  onMacOS: vi.fn(),
}));

import { isMacOS, onMacOS } from '@shared/platform';

const mockIsMacOS = vi.mocked(isMacOS);
const mockOnMacOS = vi.mocked(onMacOS);

function setupMacOS(isDarwin: boolean) {
  mockIsMacOS.mockReturnValue(isDarwin);
  mockOnMacOS.mockImplementation(<T>(fn: () => T): T | undefined => {
    if (isDarwin) return fn();
    return undefined;
  });
}

function makeMockApp() {
  let capturedOpenFileCallback: OpenFileCallback | null = null;

  const on: MockAppOn = (event, cb) => {
    if (event === 'open-file') {
      // unknown → OpenFileCallback 캐스팅: MockAppOn cb는 unknown[] 파라미터라 좁혀야 함
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      capturedOpenFileCallback = cb as unknown as OpenFileCallback;
    }
  };

  return {
    app: { on: vi.fn(on), whenReady: vi.fn().mockResolvedValue(undefined) },
    getOpenFileCallback: () => capturedOpenFileCallback,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('OpenFileHandler — R5', () => {
  beforeEach(() => {
    setupMacOS(true);
  });

  it('darwin에서 onMacOS를 호출한다', async () => {
    const { app } = makeMockApp();
    const { registerOpenFileHandler } = await import('../../src/main/open-file-handler');
    registerOpenFileHandler(app as never);
    expect(mockOnMacOS).toHaveBeenCalled();
  });

  it('non-darwin에서는 app.on("open-file")을 등록하지 않는다', async () => {
    setupMacOS(false);
    const { app } = makeMockApp();
    const { registerOpenFileHandler } = await import('../../src/main/open-file-handler');
    registerOpenFileHandler(app as never);
    expect(app.on).not.toHaveBeenCalled();
  });

  it('ready 이전 open-file 이벤트를 큐에 저장한다', async () => {
    const { app, getOpenFileCallback } = makeMockApp();

    const mockWebContents = { send: vi.fn() };
    const mockBrowserWindow = { webContents: mockWebContents } as unknown as BrowserWindow;

    const { registerOpenFileHandler, flushQueueToWindow } = await import(
      '../../src/main/open-file-handler'
    );
    registerOpenFileHandler(app as never);

    const cb = getOpenFileCallback();
    expect(cb).not.toBeNull();
    cb!({ preventDefault: vi.fn() }, '/path/to/doc.md');

    flushQueueToWindow(mockBrowserWindow);

    expect(mockWebContents.send).toHaveBeenCalledWith(API_DOCUMENT_OPENED, '/path/to/doc.md');
  });

  it('여러 경로가 큐잉되면 모두 flush한다', async () => {
    const { app, getOpenFileCallback } = makeMockApp();

    const mockWebContents = { send: vi.fn() };
    const mockBrowserWindow = { webContents: mockWebContents } as unknown as BrowserWindow;

    const { registerOpenFileHandler, flushQueueToWindow } = await import(
      '../../src/main/open-file-handler'
    );
    registerOpenFileHandler(app as never);

    const cb = getOpenFileCallback();
    const mockEvent = { preventDefault: vi.fn() };
    cb!( mockEvent, '/path/a.md');
    cb!(mockEvent, '/path/b.md');

    flushQueueToWindow(mockBrowserWindow);

    expect(mockWebContents.send).toHaveBeenCalledTimes(2);
    expect(mockWebContents.send).toHaveBeenCalledWith(API_DOCUMENT_OPENED, '/path/a.md');
    expect(mockWebContents.send).toHaveBeenCalledWith(API_DOCUMENT_OPENED, '/path/b.md');
  });

  it('flush 후 큐는 비워진다', async () => {
    const { app, getOpenFileCallback } = makeMockApp();

    const mockWebContents = { send: vi.fn() };
    const mockBrowserWindow = { webContents: mockWebContents } as unknown as BrowserWindow;

    const { registerOpenFileHandler, flushQueueToWindow } = await import(
      '../../src/main/open-file-handler'
    );
    registerOpenFileHandler(app as never);

    const cb = getOpenFileCallback();
    cb!({ preventDefault: vi.fn() }, '/path/doc.md');

    flushQueueToWindow(mockBrowserWindow);
    mockWebContents.send.mockClear();
    // 두 번째 flush — 큐가 비어있으므로 send 호출 없음
    flushQueueToWindow(mockBrowserWindow);

    expect(mockWebContents.send).not.toHaveBeenCalled();
  });
});
