// @vitest-environment jsdom
// 사후 RTL: 토글 클릭 시 store visible 반전, aria-pressed 동기화, localStorage persist
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SidebarToggleButton } from '../../src/renderer/src/components/SidebarToggleButton';
import { sidebarStore } from '../../src/renderer/src/store/sidebar-store';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('SidebarToggleButton', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // store를 초기 상태(visible=true)로 리셋
    act(() => {
      sidebarStore.getState().setVisible(true);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('버튼에 aria-label="목차 표시/숨기기" 존재', () => {
    const { getByRole } = render(<SidebarToggleButton />);
    expect(getByRole('button', { name: '목차 표시/숨기기' })).toBeInTheDocument();
  });

  it('visible=true 시 aria-pressed="true"', () => {
    act(() => { sidebarStore.getState().setVisible(true); });
    const { getByRole } = render(<SidebarToggleButton />);
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('visible=false 시 aria-pressed="false"', () => {
    act(() => { sidebarStore.getState().setVisible(false); });
    const { getByRole } = render(<SidebarToggleButton />);
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('클릭 시 visible 반전', () => {
    act(() => { sidebarStore.getState().setVisible(true); });
    const { getByRole } = render(<SidebarToggleButton />);

    fireEvent.click(getByRole('button'));

    expect(sidebarStore.getState().visible).toBe(false);
  });

  it('클릭 시 localStorage에 상태 저장', () => {
    act(() => { sidebarStore.getState().setVisible(true); });
    const { getByRole } = render(<SidebarToggleButton />);

    fireEvent.click(getByRole('button'));

    expect(localStorageMock.getItem('mddolphin.sidebar.visible')).toBe('false');
  });
});
