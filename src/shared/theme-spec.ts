// theme-spec.ts — 사용자 테마 팩 타입 정의 + 단일 진실원 매핑 (사이클 12 P12-1)
// TOKEN_KEYS + TOKEN_TO_CSS_VAR는 validate·apply·migrate 모두 참조하는 단일 진실원.
// 동결 4종(--bg/--text/--code-bg/--quote-bar) + 신규 17종 = 21종.

/** 테마 팩 토큰 21개 — JSON 키 형식 */
export interface ThemeTokens {
  readonly 'color.bg': string;
  readonly 'color.text': string;
  readonly 'color.text.muted': string;
  readonly 'color.code.bg': string;
  readonly 'color.quote.bar': string;
  readonly 'color.heading.h1': string;
  readonly 'color.heading.h2': string;
  readonly 'color.heading.h3': string;
  readonly 'color.heading.h4': string;
  readonly 'color.link': string;
  readonly 'color.link.external': string;
  readonly 'color.link.tooltip.bg': string;
  readonly 'color.link.tooltip.text': string;
  readonly 'color.table.border': string;
  readonly 'color.table.header.bg': string;
  readonly 'color.table.row.alt.bg': string;
  readonly 'color.image.fallback.border': string;
  readonly 'color.image.caption.text': string;
  readonly 'color.sidebar.bg': string;
  readonly 'color.sidebar.border': string;
  readonly 'color.sidebar.link.active': string;
}

/** 테마 팩 — 1파일 = 라이트/다크 페어 + shiki 빌트인 테마 이름 */
export interface ThemePack {
  readonly id: string;          // 파일명(stem) 또는 'builtin:default'/'builtin:solarized'/'builtin:nord'
  readonly name: string;        // UI 표시명 (메뉴 verbatim — i18n 미적용)
  readonly source: 'builtin' | 'user';
  readonly light: ThemeTokens;
  readonly dark: ThemeTokens;
  readonly shiki: {
    readonly light: string;
    readonly dark: string;
  };
}

/** 모든 토큰 키 — exhaustive 21개 배열 (단일 진실원) */
export const TOKEN_KEYS = [
  'color.bg',
  'color.text',
  'color.text.muted',
  'color.code.bg',
  'color.quote.bar',
  'color.heading.h1',
  'color.heading.h2',
  'color.heading.h3',
  'color.heading.h4',
  'color.link',
  'color.link.external',
  'color.link.tooltip.bg',
  'color.link.tooltip.text',
  'color.table.border',
  'color.table.header.bg',
  'color.table.row.alt.bg',
  'color.image.fallback.border',
  'color.image.caption.text',
  'color.sidebar.bg',
  'color.sidebar.border',
  'color.sidebar.link.active',
] as const satisfies readonly (keyof ThemeTokens)[];

// compile-time exhaustiveness check — ThemeTokens에 키가 추가되면 이 라인에서 타입 오류 발생
type _AllKeysCovered = Exclude<keyof ThemeTokens, typeof TOKEN_KEYS[number]> extends never
  ? true
  : false;
const _exhaustiveCheck: _AllKeysCovered = true;
void _exhaustiveCheck; // 미사용 변수 경고 방지

/** JSON 키 → CSS 변수명 매핑 (단일 진실원) */
export const TOKEN_TO_CSS_VAR: Readonly<Record<keyof ThemeTokens, string>> = {
  'color.bg': '--bg',
  'color.text': '--text',
  'color.text.muted': '--text-muted',
  'color.code.bg': '--code-bg',
  'color.quote.bar': '--quote-bar',
  'color.heading.h1': '--heading-h1',
  'color.heading.h2': '--heading-h2',
  'color.heading.h3': '--heading-h3',
  'color.heading.h4': '--heading-h4',
  'color.link': '--link',
  'color.link.external': '--link-external',
  'color.link.tooltip.bg': '--link-tooltip-bg',
  'color.link.tooltip.text': '--link-tooltip-text',
  'color.table.border': '--table-border',
  'color.table.header.bg': '--table-header-bg',
  'color.table.row.alt.bg': '--table-row-alt-bg',
  'color.image.fallback.border': '--image-fallback-border',
  'color.image.caption.text': '--image-caption-text',
  'color.sidebar.bg': '--sidebar-bg',
  'color.sidebar.border': '--sidebar-border',
  'color.sidebar.link.active': '--sidebar-link-active',
} as const;
