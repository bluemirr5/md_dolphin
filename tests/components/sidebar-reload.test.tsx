// @vitest-environment jsdom
// 사후 테스트 — sidebar-reload (CR8-8 흡수)
// AC11: localStorage persist → reload 시 visible 복원
// localStorage.mddolphin.sidebar.visible=false 사전 설정 → 앱 마운트 시 사이드바 미표시
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const STORAGE_KEY = 'mddolphin.sidebar.visible';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    _store: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// sidebar-store는 모듈 최상위에서 readInitialVisible()를 호출하므로
// localStorage 상태를 먼저 설정한 뒤 모듈을 동적 import해야 한다
beforeEach(() => {
  localStorageMock.clear();
  vi.resetModules(); // 각 테스트마다 모듈 캐시 초기화
});

afterEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

describe('CR8-8 — localStorage persist → reload 복원', () => {
  it('localStorage에 visible=false 설정 시 초기 visible이 false이다', async () => {
    // reload 전 상태 시뮬레이션 — localStorage에 false를 사전 설정
    localStorageMock.setItem(STORAGE_KEY, 'false');

    // 모듈 재로드 (vi.resetModules 후 동적 import = 앱 재시작 시뮬레이션)
    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    expect(sidebarStore.getState().visible).toBe(false);
  });

  it('localStorage에 visible=true 설정 시 초기 visible이 true이다', async () => {
    localStorageMock.setItem(STORAGE_KEY, 'true');

    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    expect(sidebarStore.getState().visible).toBe(true);
  });

  it('localStorage가 비어 있으면 기본값 true이다', async () => {
    // localStorage 비움 (clear 상태)
    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    expect(sidebarStore.getState().visible).toBe(true);
  });

  it('toggle() 후 localStorage에 변경된 값이 저장된다', async () => {
    localStorageMock.setItem(STORAGE_KEY, 'true');
    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    act(() => {
      sidebarStore.getState().toggle();
    });

    expect(localStorageMock.getItem(STORAGE_KEY)).toBe('false');
  });

  it('setVisible(false) 후 localStorage에 false가 저장된다', async () => {
    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    act(() => {
      sidebarStore.getState().setVisible(false);
    });

    expect(localStorageMock.getItem(STORAGE_KEY)).toBe('false');
    expect(sidebarStore.getState().visible).toBe(false);
  });

  it('localStorage 값이 잘못된 JSON이면 기본값 true로 폴백한다', async () => {
    localStorageMock.setItem(STORAGE_KEY, 'not-json');

    const { sidebarStore } = await import('../../src/renderer/src/store/sidebar-store');

    expect(sidebarStore.getState().visible).toBe(true);
  });
});
