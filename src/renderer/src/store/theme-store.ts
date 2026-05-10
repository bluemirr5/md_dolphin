// theme-store — 앱 전역 단일 Zustand store
// 설계 제약: document-store의 factory 패턴과 달리 모듈 최상위 useThemeStore export 허용
// 모든 윈도우가 동일 시스템 테마 공유 — 윈도우별 독립 상태 불필요 (마스터 플랜 5.2)
import { create } from 'zustand';
import type { RenderingTheme } from '@shared/theme-types';

export interface ThemeState {
  readonly theme: RenderingTheme;
  readonly setTheme: (theme: RenderingTheme) => void;
}

/**
 * 앱 전역 테마 store.
 * ThemeProvider가 초기값을 api.getTheme()으로 갱신한다.
 */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: 'light',
  setTheme: (theme: RenderingTheme) => {
    // 동일 값 재set 시 구독자 알림 발생 방지 (멱등성 — AC1)
    if (get().theme === theme) return;
    set({ theme });
  },
}));
