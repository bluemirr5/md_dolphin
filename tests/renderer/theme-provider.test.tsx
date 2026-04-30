// @vitest-environment jsdom
// TDD R3: ThemeProvider — mount 시 dataset.theme 세팅, watchTheme push 시 갱신, unmount 시 dispose 호출
// AC3: mount → document.documentElement.dataset.theme === api.getTheme() 결과
//       watchTheme push('dark') 시 dataset 갱신
//       unmount 시 dispose 호출
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../src/renderer/src/context/ThemeProvider';
import type { ThemeUpdatePayload } from '../../src/shared/theme-types';

// window.api mock — preload 표면 시뮬레이션
let capturedWatchCallback: ((payload: ThemeUpdatePayload) => void) | null = null;

function makeApi(initialTheme: 'light' | 'dark' = 'light') {
  const getTheme = vi.fn().mockResolvedValue(initialTheme);
  const watchDisposes = vi.fn();
  const watchTheme = vi.fn((cb: (payload: ThemeUpdatePayload) => void) => {
    capturedWatchCallback = cb;
    return watchDisposes;
  });

  return { getTheme, watchTheme, watchDisposes };
}

beforeEach(() => {
  capturedWatchCallback = null;
  // dataset 초기화
  delete document.documentElement.dataset['theme'];
});

function installMockApi(api: ReturnType<typeof makeApi>) {
  Object.defineProperty(window, 'api', {
    value: {
      getTheme: api.getTheme,
      watchTheme: api.watchTheme,
    },
    writable: true,
    configurable: true,
  });
}

describe('ThemeProvider — R3 (AC3)', () => {
  it('mount 시 api.getTheme()을 호출한다', async () => {
    const api = makeApi('light');
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(api.getTheme).toHaveBeenCalledTimes(1);
    });
  });

  it('mount 후 document.documentElement.dataset.theme이 getTheme() 결과와 일치한다 (light)', async () => {
    const api = makeApi('light');
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('light');
    });
  });

  it('mount 후 document.documentElement.dataset.theme이 getTheme() 결과와 일치한다 (dark)', async () => {
    const api = makeApi('dark');
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('dark');
    });
  });

  it('watchTheme push("dark") 시 dataset.theme이 dark로 갱신된다', async () => {
    const api = makeApi('light');
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    // 초기 상태 대기
    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('light');
    });

    // push 이벤트 시뮬레이션
    act(() => {
      capturedWatchCallback?.({ theme: 'dark', source: 'native' });
    });

    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('unmount 시 dispose(watchTheme 반환값)가 호출된다', async () => {
    const api = makeApi('light');
    installMockApi(api);

    const { unmount } = render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(api.watchTheme).toHaveBeenCalledTimes(1);
    });

    expect(api.watchDisposes).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(api.watchDisposes).toHaveBeenCalledTimes(1);
  });

  it('mount 시 api.watchTheme을 구독한다', async () => {
    const api = makeApi('light');
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(api.watchTheme).toHaveBeenCalledTimes(1);
    });
  });
});
