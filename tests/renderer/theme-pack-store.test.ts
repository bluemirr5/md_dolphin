// R3 TDD — theme-pack-store.ts + applyThemePack.ts
// setActiveId 멱등, localStorage 왕복, storage event listener 동기 (P12-5)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// localStorage mock은 jsdom이 제공
const STORAGE_KEY = 'mddolphin.theme-pack.active';

describe('theme-pack-store', () => {
  // 각 테스트 전에 store 모듈을 재초기화 (localStorage 격리)
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('초기 activeId는 localStorage 값 또는 builtin:default여야 한다', async () => {
    const { useActivePackId: _useActivePackId } = await import('../../src/renderer/src/store/theme-pack-store');
    // zustand 스토어에서 직접 get
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');
    expect(themePackStore.getState().activeId).toBe('builtin:default');
  });

  it('localStorage에 저장된 값으로 초기화해야 한다', async () => {
    localStorage.setItem(STORAGE_KEY, 'builtin:solarized');
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');
    expect(themePackStore.getState().activeId).toBe('builtin:solarized');
  });

  it('setActiveId가 localStorage에 저장해야 한다', async () => {
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');
    themePackStore.getState().setActiveId('builtin:nord');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('builtin:nord');
    expect(themePackStore.getState().activeId).toBe('builtin:nord');
  });

  it('setActiveId 멱등 — 동일 값 재호출 시 상태 변화 없어야 한다', async () => {
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');
    themePackStore.getState().setActiveId('builtin:default');
    const subscribeCallback = vi.fn();
    themePackStore.subscribe(subscribeCallback);
    themePackStore.getState().setActiveId('builtin:default'); // same value
    expect(subscribeCallback).not.toHaveBeenCalled();
  });

  it('storage event로 다른 창의 변경을 동기해야 한다 (P12-5)', async () => {
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');

    // 다른 origin(window)에서 storage event 발생 시뮬레이션
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: 'builtin:solarized',
      storageArea: localStorage,
    }));

    expect(themePackStore.getState().activeId).toBe('builtin:solarized');
  });

  it('storage event — 다른 키는 무시해야 한다', async () => {
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'other.key',
      newValue: 'builtin:nord',
      storageArea: localStorage,
    }));

    expect(themePackStore.getState().activeId).toBe('builtin:default'); // 변경 없음
  });

  it('storage event — newValue가 null이면 기본값으로 복원해야 한다', async () => {
    const { themePackStore } = await import('../../src/renderer/src/store/theme-pack-store');
    themePackStore.getState().setActiveId('builtin:solarized');

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: null,
      storageArea: localStorage,
    }));

    expect(themePackStore.getState().activeId).toBe('builtin:default');
  });
});
