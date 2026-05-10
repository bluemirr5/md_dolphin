// R1 TDD — theme-spec.ts
// TOKEN_KEYS가 21개이고 ThemeTokens 키와 exhaustive하게 일치하는지 검증
import { describe, it, expect } from 'vitest';
import { TOKEN_KEYS, TOKEN_TO_CSS_VAR } from '@shared/theme-spec';
import type { ThemeTokens } from '@shared/theme-spec';

describe('TOKEN_KEYS', () => {
  it('21개여야 한다', () => {
    expect(TOKEN_KEYS).toHaveLength(21);
  });

  it('중복 없이 21개의 고유 키를 가져야 한다', () => {
    const unique = new Set(TOKEN_KEYS);
    expect(unique.size).toBe(21);
  });

  it('TOKEN_TO_CSS_VAR이 TOKEN_KEYS와 동일한 키 집합을 가져야 한다', () => {
    const varKeys = Object.keys(TOKEN_TO_CSS_VAR) as (keyof ThemeTokens)[];
    expect(varKeys.sort()).toEqual([...TOKEN_KEYS].sort());
  });

  it('TOKEN_TO_CSS_VAR의 모든 값은 --로 시작하는 CSS 변수명이어야 한다', () => {
    for (const cssVar of Object.values(TOKEN_TO_CSS_VAR)) {
      expect(cssVar).toMatch(/^--/);
    }
  });

  it('4동결 변수(--bg, --text, --code-bg, --quote-bar)가 포함되어야 한다', () => {
    const cssVars = Object.values(TOKEN_TO_CSS_VAR);
    expect(cssVars).toContain('--bg');
    expect(cssVars).toContain('--text');
    expect(cssVars).toContain('--code-bg');
    expect(cssVars).toContain('--quote-bar');
  });
});
