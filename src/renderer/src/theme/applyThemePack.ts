// applyThemePack.ts — 테마 팩 토큰을 CSS 변수로 주입 (사이클 12)
// documentElement.style.setProperty(inline style)가 :root[data-theme=...] selector보다
// specificity 우선이라 4동결 fallback CSS가 자동 보존됨 (advisor 결정)
// DOM API 사용이라 CSP style-src 미영향 (P2-2)
import type { ThemePack } from '@shared/theme-spec';
import { TOKEN_KEYS, TOKEN_TO_CSS_VAR } from '@shared/theme-spec';
import type { RenderingTheme } from '@shared/theme-types';

/**
 * 테마 팩의 토큰을 document.documentElement 인라인 스타일로 주입한다.
 * TOKEN_KEYS 21개 순회로 누락 0 보장 (exhaustiveness compile 체크 포함).
 *
 * @param pack  적용할 테마 팩
 * @param mode  'light' | 'dark' — 시스템 resolved 테마
 */
export function applyThemePack(pack: ThemePack, mode: RenderingTheme): void {
  const tokens = mode === 'dark' ? pack.dark : pack.light;
  const root = document.documentElement;

  for (const key of TOKEN_KEYS) {
    const cssVar = TOKEN_TO_CSS_VAR[key];
    root.style.setProperty(cssVar, tokens[key]);
  }
}

/**
 * applyThemePack으로 주입한 인라인 스타일을 제거하여 CSS fallback으로 복원한다.
 * (실제로는 default 팩을 항상 적용하므로 호출 거의 없음)
 */
export function clearThemePack(): void {
  const root = document.documentElement;
  for (const key of TOKEN_KEYS) {
    const cssVar = TOKEN_TO_CSS_VAR[key];
    root.style.removeProperty(cssVar);
  }
}
