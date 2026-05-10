// ThemeProvider — 시스템 테마를 구독하고 document.documentElement.dataset.theme에 주입
// 설계 제약:
// - mount 시 api.getTheme() 1회 invoke → dataset.theme 세팅 (FOUC 방지)
// - api.watchTheme(cb) 구독 → nativeTheme 변경 시 dataset.theme 갱신
// - unmount 시 dispose 호출 — Strict Mode 안전 (listener 누적 방지)
// - CSS 변수 진입점: document.documentElement.dataset.theme 단일화 (P4-1)
// 사이클 12: 테마 팩 적용 추가
// - 적용 순서: dataset.theme 토글 → applyThemePack → setShikiThemes
import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '../store/theme-store';
import { themePackStore } from '../store/theme-pack-store';
import { applyThemePack } from '../theme/applyThemePack';
import { setShikiThemes } from '../markdown/shiki-loader';
import type { ThemeUpdatePayload } from '@shared/theme-types';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * 앱 최상위에서 시스템 테마를 주입하는 Provider.
 * ThemeProvider(외) → DocumentProvider(내) 순서 고정 (사이클 3 P3-6 준수).
 * 사이클 12: 테마 팩 적용 포함 — dataset.theme 토글 → applyThemePack → setShikiThemes 순서 보장.
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const setTheme = useThemeStore((s) => s.setTheme);
  const renderingTheme = useThemeStore((s) => s.theme);

  // mount 시 팩 목록 fetch + active fallback 처리
  useEffect(() => {
    let disposed = false;
    let disposeWatch: (() => void) | null = null;
    let disposeThemePackSetActive: (() => void) | null = null;
    let disposeThemePackListChanged: (() => void) | null = null;

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

    // 3. 테마 팩 목록 fetch + available 갱신
    void window.api.themePackList().then((packs) => {
      if (disposed) return;
      themePackStore.getState().setAvailable(packs);

      // active fallback: active id가 목록에 없으면 builtin:default로 복원
      const { activeId } = themePackStore.getState();
      const found = packs.find((p) => p.id === activeId);
      if (!found) {
        themePackStore.getState().setActiveId('builtin:default');
      }
    });

    // 4. 메뉴에서 테마 변경 요청 이벤트 구독
    disposeThemePackSetActive = window.api.onThemePackSetActive((id) => {
      themePackStore.getState().setActiveId(id);
    });

    // 5. 팩 목록 변경 이벤트 구독
    disposeThemePackListChanged = window.api.onThemePackListChanged((packs) => {
      if (disposed) return;
      themePackStore.getState().setAvailable(packs);
    });

    return () => {
      disposed = true;
      disposeWatch?.();
      disposeThemePackSetActive?.();
      disposeThemePackListChanged?.();
    };
  }, [setTheme]);

  // 6. 팩 + 시스템 테마 변경 시 재적용 (renderingTheme, activeId 모두 deps)
  useEffect(() => {
    const { activeId, available } = themePackStore.getState();
    const pack = available.find((p) => p.id === activeId);
    if (!pack || !renderingTheme) return;

    // 적용 순서: dataset.theme 이미 위에서 세팅됨 → applyThemePack → setShikiThemes
    applyThemePack(pack, renderingTheme);
    void setShikiThemes(pack.shiki.light, pack.shiki.dark);
  }, [renderingTheme]);

  // 7. activeId 변경 시 재적용 (별도 구독)
  useEffect(() => {
    return themePackStore.subscribe((state) => {
      const { activeId, available } = state;
      const pack = available.find((p) => p.id === activeId);
      if (!pack || !renderingTheme) return;

      applyThemePack(pack, renderingTheme);
      void setShikiThemes(pack.shiki.light, pack.shiki.dark);
    });
  }, [renderingTheme]);

  return <>{children}</>;
}
