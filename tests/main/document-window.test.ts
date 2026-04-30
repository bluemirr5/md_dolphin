// R4: DocumentWindow Map + dispose
// AC5: register(win) 후 close 이벤트 발화 시 Map에서 제거, baseDir 갱신
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DocumentWindowManager } from '../../src/main/document-window';

// BrowserWindow mock
function makeMockWindow(id: number) {
  const listeners: Map<string, (() => void)[]> = new Map();
  return {
    id,
    webContents: { id: id * 10 },
    on: vi.fn((event: string, cb: () => void) => {
      const existing = listeners.get(event) ?? [];
      existing.push(cb);
      listeners.set(event, existing);
    }),
    emit: (event: string) => {
      (listeners.get(event) ?? []).forEach((cb) => cb());
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DocumentWindowManager — R4', () => {
  it('register 후 윈도우가 Map에 등록된다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(1);

    manager.register(win as never, undefined);

    expect(manager.get(win as never)).toBeDefined();
  });

  it('close 이벤트 발화 시 Map에서 제거된다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(1);

    manager.register(win as never, undefined);
    expect(manager.get(win as never)).toBeDefined();

    // close 이벤트 발화
    win.emit('closed');

    expect(manager.get(win as never)).toBeUndefined();
  });

  it('여러 윈도우를 독립적으로 관리한다', () => {
    const manager = new DocumentWindowManager();
    const win1 = makeMockWindow(1);
    const win2 = makeMockWindow(2);

    manager.register(win1 as never, '/base1');
    manager.register(win2 as never, '/base2');

    // win1 close
    win1.emit('closed');

    expect(manager.get(win1 as never)).toBeUndefined();
    expect(manager.get(win2 as never)).toBeDefined();
    expect(manager.get(win2 as never)?.baseDir).toBe('/base2');
  });

  it('setBaseDir로 baseDir를 갱신한다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(1);

    manager.register(win as never, undefined);
    manager.setBaseDir(win as never, '/new-base');

    expect(manager.get(win as never)?.baseDir).toBe('/new-base');
  });

  it('register 시 초기 baseDir를 설정한다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(1);

    manager.register(win as never, '/initial-base');

    expect(manager.get(win as never)?.baseDir).toBe('/initial-base');
  });

  it('register 시 초기 baseDir를 undefined로 설정한다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(1);

    manager.register(win as never, undefined);

    expect(manager.get(win as never)?.baseDir).toBeUndefined();
  });

  it('미등록 윈도우에 get하면 undefined를 반환한다', () => {
    const manager = new DocumentWindowManager();
    const win = makeMockWindow(99);

    expect(manager.get(win as never)).toBeUndefined();
  });

  it('size()가 등록된 윈도우 수를 반환한다', () => {
    const manager = new DocumentWindowManager();
    const win1 = makeMockWindow(1);
    const win2 = makeMockWindow(2);

    expect(manager.size()).toBe(0);
    manager.register(win1 as never, undefined);
    expect(manager.size()).toBe(1);
    manager.register(win2 as never, undefined);
    expect(manager.size()).toBe(2);

    win1.emit('closed');
    expect(manager.size()).toBe(1);
  });
});
