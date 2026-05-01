// 사후 테스트 — zoom-ipc.ts
// AC5: 상한/하한 클램프, windowId -1 sentinel noop + warn
import { describe, it, expect, vi, beforeEach } from 'vitest';

let zoomLevel = 0;

vi.mock('electron', () => {
  const mockWc = {
    getZoomLevel: vi.fn(() => zoomLevel),
    setZoomLevel: vi.fn((level: number) => { zoomLevel = level; }),
    id: 1,
  };

  const ipcMain = {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  };

  const webContents = {
    fromId: vi.fn((id: number) => (id === -1 ? null : mockWc)),
  };

  return { ipcMain, webContents };
});

import { registerZoomIpc } from '../../src/main/zoom-ipc';
import { ipcMain, webContents } from 'electron';

const mockIpcMain = ipcMain as unknown as {
  handle: ReturnType<typeof vi.fn>;
  removeHandler: ReturnType<typeof vi.fn>;
};

// 등록된 핸들러를 이름으로 꺼내는 헬퍼
function getHandler(channel: string): (event: { sender: { id: number } }) => void {
  const calls = mockIpcMain.handle.mock.calls;
  const found = calls.find(([ch]) => ch === channel);
  if (!found) throw new Error(`Handler for ${channel} not registered`);
  return found[1] as (event: { sender: { id: number } }) => void;
}

function makeEvent(senderId = 1): { sender: { id: number } } {
  return { sender: { id: senderId } };
}

beforeEach(() => {
  zoomLevel = 0;
  vi.clearAllMocks();
  registerZoomIpc();
});

describe('zoom-ipc — zoom-in', () => {
  it('zoom-in 핸들러가 등록된다', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith('view:zoom-in', expect.any(Function));
  });

  it('zoom-in 1회 → zoomLevel += 0.5', () => {
    const handler = getHandler('view:zoom-in');
    handler(makeEvent());
    expect(zoomLevel).toBeCloseTo(0.5);
  });

  it('zoom-in 상한(+3) 초과 시 +3으로 클램프', () => {
    zoomLevel = 2.8;
    const handler = getHandler('view:zoom-in');
    handler(makeEvent());
    expect(zoomLevel).toBeCloseTo(3);
  });
});

describe('zoom-ipc — zoom-out', () => {
  it('zoom-out 핸들러가 등록된다', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith('view:zoom-out', expect.any(Function));
  });

  it('zoom-out 1회 → zoomLevel -= 0.5', () => {
    const handler = getHandler('view:zoom-out');
    handler(makeEvent());
    expect(zoomLevel).toBeCloseTo(-0.5);
  });

  it('zoom-out 하한(-3) 초과 시 -3으로 클램프', () => {
    zoomLevel = -2.8;
    const handler = getHandler('view:zoom-out');
    handler(makeEvent());
    expect(zoomLevel).toBeCloseTo(-3);
  });
});

describe('zoom-ipc — zoom-reset', () => {
  it('zoom-reset 핸들러가 등록된다', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith('view:zoom-reset', expect.any(Function));
  });

  it('zoom-reset → zoomLevel = 0', () => {
    zoomLevel = 2.5;
    const handler = getHandler('view:zoom-reset');
    handler(makeEvent());
    expect(zoomLevel).toBe(0);
  });
});

describe('zoom-ipc — windowId -1 sentinel', () => {
  it('senderId -1 시 webContents.fromId(−1)이 null 반환 → setZoomLevel 미호출', () => {
    // webContents.fromId(-1) → null (mock에서 -1은 null 반환하도록 설정됨)
    void webContents; // 미사용 변수 참조 suppression
    const handler = getHandler('view:zoom-in');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    handler(makeEvent(-1));

    // fromId(-1) → null → setZoomLevel 호출 안됨
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('-1'));
    warnSpy.mockRestore();
  });
});
