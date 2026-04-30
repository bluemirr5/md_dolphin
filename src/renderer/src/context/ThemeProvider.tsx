// ThemeProvider — 시스템 테마를 구독하고 document.documentElement.dataset.theme에 주입
// 설계 제약:
// - mount 시 api.getTheme() 1회 invoke → dataset.theme 세팅 (FOUC 방지)
// - api.watchTheme(cb) 구독 → nativeTheme 변경 시 dataset.theme 갱신
// - unmount 시 dispose 호출 — Strict Mode 안전 (listener 누적 방지)
// - CSS 변수 진입점: document.documentElement.dataset.theme 단일화 (P4-1)
import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '../store/theme-store';
import type { ThemeUpdatePayload } from '@shared/theme-types';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * 앱 최상위에서 시스템 테마를 주입하는 Provider.
 * ThemeProvider(외) → DocumentProvider(내) 순서 고정 (사이클 3 P3-6 준수).
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    let disposed = false;
    let disposeWatch: (() => void) | null = null;

    // 1. 현재 테마 1회 조회 → dataset 세팅
    void window.api.getTheme().then((theme) => {
      if (disposed) return;
      setTheme(theme);
      document.documentElement.dataset['theme'] = theme;
    });

    // 2. 테마 변경 이벤트 구독 → dataset 갱신
    disposeWatch = window.api.watchTheme((payload: ThemeUpdatePayload) => {
      setTheme(payload.theme);
      document.documentElement.dataset['theme'] = payload.theme;
    });

    return () => {
      disposed = true;
      disposeWatch?.();
    };
  }, [setTheme]);

  return <>{children}</>;
}
