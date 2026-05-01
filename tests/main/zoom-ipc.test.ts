// 사후 테스트 — zoom-ipc.ts
// 사이클 9 AC5: 상한/하한 클램프, windowId -1 sentinel noop + warn
// 사이클 10 P10-4: setZoomFactor 1.0 고정, view:zoom-changed로 zoomLevel 푸시
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => {
  const mockWc = {
    setZoomFactor: vi.fn(),
    send: vi.fn(),
    id: 1,
  };

  const ipcMain = {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  };

  const webContents = {
    fromId: vi.fn((id: number) => (id === -1 ? null : mockWc)),
  };

  return { ipcMain, webContents, _mockWc: mockWc };
});

import { registerZoomIpc, _resetZoomLevelsForTest } from '../../src/main/zoom-ipc';
import { ipcMain, webContents } from 'electron';

const electronMock = ipcMain as unknown as {
  handle: ReturnType<typeof vi.fn>;
  removeHandler: ReturnType<typeof vi.fn>;
};

// electron mock에서 내부 mockWc 참조
type ElectronMockModule = {
  _mockWc: { setZoomFactor: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; id: number };
};

// 등록된 핸들러를 이름으로 꺼내는 헬퍼
function getHandler(channel: string): (event: { sender: { id: number } }) => void {
  const calls = electronMock.handle.mock.calls;
  const found = calls.find(([ch]) => ch === channel);
  if (!found) throw new Error(`Handler for ${channel} not registered`);
  return found[1] as (event: { sender: { id: number } }) => void;
}

function makeEvent(senderId = 1): { sender: { id: number } } {
  return { sender: { id: senderId } };
}

async function getMockWc() {
  const mod = await import('electron') as unknown as ElectronMockModule;
  return mod._mockWc;
}

function getSentZoomLevel(sendMock: ReturnType<typeof vi.fn>): number | null {
  const calls = sendMock.mock.calls;
  const lastZoomChange = [...calls].reverse().find(([ch]: [string]) => ch === 'view:zoom-changed');
  return lastZoomChange ? (lastZoomChange[1] as number) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetZoomLevelsForTest();
  registerZoomIpc();
});

describe('zoom-ipc — zoom-in', () => {
  it('zoom-in 핸들러가 등록된다', () => {
    expect(electronMock.handle).toHaveBeenCalledWith('view:zoom-in', expect.any(Function));
  });

  it('zoom-in 1회 → view:zoom-changed에 +0.5 전달', async () => {
    const { send } = await getMockWc();
    const handler = getHandler('view:zoom-in');
    handler(makeEvent());
    expect(getSentZoomLevel(send)).toBeCloseTo(0.5);
  });

  it('zoom-in 상한(+3) 초과 시 +3으로 클램프', async () => {
    const { send } = await getMockWc();
    const handler = getHandler('view:zoom-in');
    for (let i = 0; i < 8; i++) handler(makeEvent());
    expect(getSentZoomLevel(send)).toBeCloseTo(3);
  });

  it('setZoomFactor(1.0) 고정 호출 (P10-4)', async () => {
    const { setZoomFactor } = await getMockWc();
    const handler = getHandler('view:zoom-in');
    handler(makeEvent());
    expect(setZoomFactor).toHaveBeenCalledWith(1.0);
  });
});

describe('zoom-ipc — zoom-out', () => {
  it('zoom-out 핸들러가 등록된다', () => {
    expect(electronMock.handle).toHaveBeenCalledWith('view:zoom-out', expect.any(Function));
  });

  it('zoom-out 1회 → view:zoom-changed에 -0.5 전달', async () => {
    const { send } = await getMockWc();
    const handler = getHandler('view:zoom-out');
    handler(makeEvent());
    expect(getSentZoomLevel(send)).toBeCloseTo(-0.5);
  });

  it('zoom-out 하한(-3) 초과 시 -3으로 클램프', async () => {
    const { send } = await getMockWc();
    const handler = getHandler('view:zoom-out');
    for (let i = 0; i < 8; i++) handler(makeEvent());
    expect(getSentZoomLevel(send)).toBeCloseTo(-3);
  });
});

describe('zoom-ipc — zoom-reset', () => {
  it('zoom-reset 핸들러가 등록된다', () => {
    expect(electronMock.handle).toHaveBeenCalledWith('view:zoom-reset', expect.any(Function));
  });

  it('zoom-reset → view:zoom-changed에 0 전달', async () => {
    const { send } = await getMockWc();
    const zoomIn = getHandler('view:zoom-in');
    zoomIn(makeEvent());
    const reset = getHandler('view:zoom-reset');
    reset(makeEvent());
    expect(getSentZoomLevel(send)).toBe(0);
  });
});

describe('zoom-ipc — windowId -1 sentinel', () => {
  it('senderId -1 시 webContents.fromId(−1)이 null 반환 → setZoomFactor 미호출', async () => {
    void webContents;
    const { setZoomFactor } = await getMockWc();
    const handler = getHandler('view:zoom-in');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    handler(makeEvent(-1));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('-1'));
    expect(setZoomFactor).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
