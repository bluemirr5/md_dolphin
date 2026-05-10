// @vitest-environment jsdom
// AC4: nativeTheme dark 토글 시 applyThemePack이 dark 토큰으로 재실행
// AC7: onThemePackSetActive 콜백 → themePackStore.activeId 갱신 + localStorage 저장
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import type { ThemeUpdatePayload } from '../../src/shared/theme-types';
import type { ThemePack } from '../../src/shared/theme-spec';

// ─── applyThemePack mock — 호출 추적 ─────────────────────────────────────────
vi.mock('../../src/renderer/src/theme/applyThemePack', () => ({
  applyThemePack: vi.fn(),
  clearThemePack: vi.fn(),
}));

// ─── setShikiThemes mock ─────────────────────────────────────────────────────
vi.mock('../../src/renderer/src/markdown/shiki-loader', () => ({
  setShikiThemes: vi.fn().mockResolvedValue(undefined),
  highlightCode: vi.fn(),
  _resetForTest: vi.fn(),
}));

import { ThemeProvider } from '../../src/renderer/src/context/ThemeProvider';
import { applyThemePack } from '../../src/renderer/src/theme/applyThemePack';
import { themePackStore } from '../../src/renderer/src/store/theme-pack-store';

// 테스트용 빌트인 default 팩 (light/dark 포함)
const BUILTIN_DEFAULT: ThemePack = {
  id: 'builtin:default',
  name: 'Default',
  source: 'builtin',
  light: {
    'color.bg': '#FAFAF7',
    'color.text': '#1A1A1A',
    'color.text.muted': '#6B7280',
    'color.code.bg': '#F0EDE6',
    'color.quote.bar': '#C0B090',
    'color.heading.h1': '#1A1A1A',
    'color.heading.h2': '#1A1A1A',
    'color.heading.h3': '#1A1A1A',
    'color.heading.h4': '#1A1A1A',
    'color.link': '#0A66C2',
    'color.link.external': '#0A66C2',
    'color.link.tooltip.bg': '#333333',
    'color.link.tooltip.text': '#FFFFFF',
    'color.table.border': '#D1D1D6',
    'color.table.header.bg': '#F0EDE6',
    'color.table.row.alt.bg': '#FAFAF7',
    'color.image.fallback.border': '#D1D1D6',
    'color.image.caption.text': '#6B7280',
    'color.sidebar.bg': '#FAFAF7',
    'color.sidebar.border': '#F0EDE6',
    'color.sidebar.link.active': '#C0B090',
  },
  dark: {
    'color.bg': '#1C1C1E',
    'color.text': '#E5E5E7',
    'color.text.muted': '#9CA3AF',
    'color.code.bg': '#2C2C2E',
    'color.quote.bar': '#8A7A60',
    'color.heading.h1': '#E5E5E7',
    'color.heading.h2': '#E5E5E7',
    'color.heading.h3': '#E5E5E7',
    'color.heading.h4': '#E5E5E7',
    'color.link': '#5BA8FF',
    'color.link.external': '#5BA8FF',
    'color.link.tooltip.bg': '#1C1C1E',
    'color.link.tooltip.text': '#E5E5E7',
    'color.table.border': '#3A3A3C',
    'color.table.header.bg': '#2C2C2E',
    'color.table.row.alt.bg': '#1C1C1E',
    'color.image.fallback.border': '#3A3A3C',
    'color.image.caption.text': '#9CA3AF',
    'color.sidebar.bg': '#1C1C1E',
    'color.sidebar.border': '#2C2C2E',
    'color.sidebar.link.active': '#8A7A60',
  },
  shiki: { light: 'github-light', dark: 'github-dark' },
};

// window.api mock 헬퍼
let capturedWatchCallback: ((payload: ThemeUpdatePayload) => void) | null = null;
let capturedThemePackSetActive: ((id: string) => void) | null = null;

function makeApi(initialTheme: 'light' | 'dark' = 'light', packs: ThemePack[] = [BUILTIN_DEFAULT]) {
  capturedWatchCallback = null;
  capturedThemePackSetActive = null;

  return {
    getTheme: vi.fn().mockResolvedValue(initialTheme),
    watchTheme: vi.fn((cb: (payload: ThemeUpdatePayload) => void) => {
      capturedWatchCallback = cb;
      return vi.fn();
    }),
    themePackList: vi.fn().mockResolvedValue(packs),
    onThemePackSetActive: vi.fn((cb: (id: string) => void) => {
      capturedThemePackSetActive = cb;
      return vi.fn();
    }),
    onThemePackListChanged: vi.fn().mockReturnValue(() => undefined),
  };
}

function installMockApi(api: ReturnType<typeof makeApi>) {
  Object.defineProperty(window, 'api', {
    value: api,
    writable: true,
    configurable: true,
  });
}

const STORAGE_KEY = 'mddolphin.theme-pack.active';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset['theme'];
  // themePackStore available 초기화
  themePackStore.setState({ available: [], activeId: 'builtin:default' });
});

afterEach(() => {
  localStorage.clear();
});

describe('ThemeProvider — AC4: mode 변경 시 applyThemePack 재실행', () => {
  it('watchTheme push("dark") 시 applyThemePack이 dark 모드로 재호출된다', async () => {
    const api = makeApi('light', [BUILTIN_DEFAULT]);
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    // 초기 light 적용 대기
    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('light');
    });

    // available이 채워질 때까지 대기 (themePackList 비동기 완료)
    await waitFor(() => {
      expect(themePackStore.getState().available.length).toBeGreaterThan(0);
    });

    // 초기 light 시 applyThemePack 호출 확인
    await waitFor(() => {
      expect(vi.mocked(applyThemePack)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'builtin:default' }),
        'light',
      );
    });

    vi.mocked(applyThemePack).mockClear();

    // dark 모드 push
    act(() => {
      capturedWatchCallback?.({ theme: 'dark', source: 'native' });
    });

    // dataset 갱신 확인
    expect(document.documentElement.dataset['theme']).toBe('dark');

    // applyThemePack이 dark 모드로 재실행됐는지 확인
    await waitFor(() => {
      expect(vi.mocked(applyThemePack)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'builtin:default' }),
        'dark',
      );
    });
  });

  it('light 모드 유지 시 applyThemePack에 "light"가 전달된다', async () => {
    const api = makeApi('light', [BUILTIN_DEFAULT]);
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(themePackStore.getState().available.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const calls = vi.mocked(applyThemePack).mock.calls;
      const lightCall = calls.find((c) => c[1] === 'light');
      expect(lightCall).toBeDefined();
    });
  });
});

describe('ThemeProvider — AC7: onThemePackSetActive → store.activeId 갱신', () => {
  it('onThemePackSetActive 콜백으로 "builtin:solarized" 수신 시 activeId가 갱신된다', async () => {
    const api = makeApi('light', [BUILTIN_DEFAULT]);
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    // 콜백이 등록될 때까지 대기
    await waitFor(() => {
      expect(api.onThemePackSetActive).toHaveBeenCalledTimes(1);
    });

    // menu에서 'builtin:solarized' 선택 시뮬레이션
    act(() => {
      capturedThemePackSetActive?.('builtin:solarized');
    });

    expect(themePackStore.getState().activeId).toBe('builtin:solarized');
  });

  it('onThemePackSetActive 수신 시 localStorage에도 저장된다 (AC7 재시작 후 유지)', async () => {
    const api = makeApi('light', [BUILTIN_DEFAULT]);
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(api.onThemePackSetActive).toHaveBeenCalledTimes(1);
    });

    act(() => {
      capturedThemePackSetActive?.('builtin:nord');
    });

    // localStorage에 저장됐는지 확인
    expect(localStorage.getItem(STORAGE_KEY)).toBe('builtin:nord');
    expect(themePackStore.getState().activeId).toBe('builtin:nord');
  });

  it('active id 갱신 시 applyThemePack이 새 팩으로 재실행된다', async () => {
    const SOLARIZED_PACK: ThemePack = {
      ...BUILTIN_DEFAULT,
      id: 'builtin:solarized',
      name: 'Solarized',
      light: { ...BUILTIN_DEFAULT.light, 'color.bg': '#FDF6E3' },
    };

    const api = makeApi('light', [BUILTIN_DEFAULT, SOLARIZED_PACK]);
    installMockApi(api);

    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => {
      expect(themePackStore.getState().available.length).toBe(2);
    });

    vi.mocked(applyThemePack).mockClear();

    // 메뉴에서 solarized 선택
    act(() => {
      capturedThemePackSetActive?.('builtin:solarized');
    });

    // applyThemePack이 solarized 팩으로 재실행됐는지 확인
    await waitFor(() => {
      expect(vi.mocked(applyThemePack)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'builtin:solarized' }),
        'light',
      );
    });
  });
});
