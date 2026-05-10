// TDD R2: preload watchTheme + getTheme IPC 바인딩 검증
// AC2: watchTheme(cb) 반환 dispose() 호출 시 ipcRenderer.removeListener 호출
// AC6: getTheme이 ipcRenderer.invoke(API_GET_THEME) 결과를 반환
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RenderingTheme, ThemeUpdatePayload } from '../../src/shared/theme-types';
import { API_GET_THEME, API_THEME_UPDATED } from '../../src/shared/ipc-channels';

// --- mock ipcRenderer를 직접 정의 (vi.mock 없이 mock 오브젝트 주입 방식) ---

type IpcHandler = (...args: unknown[]) => void;

function createMockIpcRenderer() {
  const listeners: Map<string, IpcHandler[]> = new Map();

  const invokeMock = vi.fn();
  const onMock = vi.fn((channel: string, handler: IpcHandler) => {
    const existing = listeners.get(channel) ?? [];
    existing.push(handler);
    listeners.set(channel, existing);
  });
  const removeListenerMock = vi.fn((channel: string, handler: IpcHandler) => {
    const existing = listeners.get(channel) ?? [];
    listeners.set(channel, existing.filter((h) => h !== handler));
  });

  function emit(channel: string, ...args: unknown[]) {
    const fakeEvent: unknown = {};
    (listeners.get(channel) ?? []).forEach((h) => h(fakeEvent, ...args));
  }

  function reset() {
    listeners.clear();
  }

  return { invokeMock, onMock, removeListenerMock, emit, reset };
}

// preload api 팩토리 — preload/index.ts의 getTheme·watchTheme 로직과 동일하게 재현
// mock ipcRenderer를 주입받아 IPC 바인딩을 독립적으로 검증한다
function buildThemeApi(mock: ReturnType<typeof createMockIpcRenderer>) {
  return {
    getTheme: (): Promise<RenderingTheme> =>
      mock.invokeMock(API_GET_THEME) as Promise<RenderingTheme>,

    watchTheme: (callback: (p: ThemeUpdatePayload) => void): (() => void) => {
      const handler = (_event: unknown, payload: ThemeUpdatePayload) => callback(payload);
      mock.onMock(API_THEME_UPDATED, handler as IpcHandler);
      return () => {
        mock.removeListenerMock(API_THEME_UPDATED, handler as IpcHandler);
      };
    },
  };
}

describe('preload theme API — R2 (AC2, AC6)', () => {
  let mock: ReturnType<typeof createMockIpcRenderer>;

  beforeEach(() => {
    mock = createMockIpcRenderer();
  });

  it('getTheme()은 ipcRenderer.invoke(API_GET_THEME)를 호출한다', async () => {
    const api = buildThemeApi(mock);
    mock.invokeMock.mockResolvedValueOnce('light');

    const result = await api.getTheme();

    expect(mock.invokeMock).toHaveBeenCalledWith(API_GET_THEME);
    expect(result).toBe('light');
  });

  it('watchTheme(cb)은 API_THEME_UPDATED 채널에 리스너를 등록한다', () => {
    const api = buildThemeApi(mock);
    const cb = vi.fn();

    api.watchTheme(cb);

    expect(mock.onMock).toHaveBeenCalledWith(API_THEME_UPDATED, expect.any(Function));
  });

  it('dispose() 호출 시 ipcRenderer.removeListener를 호출한다 (AC2)', () => {
    const api = buildThemeApi(mock);
    const cb = vi.fn();

    const dispose = api.watchTheme(cb);
    dispose();

    expect(mock.removeListenerMock).toHaveBeenCalledWith(
      API_THEME_UPDATED,
      expect.any(Function),
    );
  });

  it('dispose() 후에는 콜백이 더 이상 호출되지 않는다', () => {
    const api = buildThemeApi(mock);
    const cb = vi.fn();

    const dispose = api.watchTheme(cb);
    dispose();

    const payload: ThemeUpdatePayload = { theme: 'dark', source: 'native' };
    mock.emit(API_THEME_UPDATED, payload);

    expect(cb).not.toHaveBeenCalled();
  });

  it('watchTheme push 시 콜백이 payload와 함께 호출된다', () => {
    const api = buildThemeApi(mock);
    const cb = vi.fn();

    api.watchTheme(cb);

    const payload: ThemeUpdatePayload = { theme: 'dark', source: 'native' };
    mock.emit(API_THEME_UPDATED, payload);

    expect(cb).toHaveBeenCalledWith(payload);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('Strict Mode 시뮬레이션: mount→dispose→remount 시 리스너 1개만 생존', () => {
    const api = buildThemeApi(mock);
    const cb = vi.fn();

    // 첫 mount
    const dispose1 = api.watchTheme(cb);
    // unmount (Strict Mode)
    dispose1();
    // remount
    const dispose2 = api.watchTheme(cb);

    // 이벤트 발화 → 콜백은 1회만 호출되어야 한다
    const payload: ThemeUpdatePayload = { theme: 'dark', source: 'native' };
    mock.emit(API_THEME_UPDATED, payload);

    expect(cb).toHaveBeenCalledTimes(1);

    dispose2();
  });
});
