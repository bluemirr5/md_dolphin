// R1 TDD — theme-validate.ts
// validateColor + validateThemePack 단위 테스트
import { describe, it, expect, vi } from 'vitest';
import { validateColor, validateThemePack } from '@shared/theme-validate';
import type { ThemeTokens } from '@shared/theme-spec';

// 테스트용 기본 토큰 팩 (모든 키가 유효한 색상)
const FALLBACK_TOKENS: ThemeTokens = {
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
};

describe('validateColor', () => {
  describe('HEX 색상', () => {
    it('#RGB(3자리)을 허용해야 한다', () => {
      expect(validateColor('#abc').ok).toBe(true);
      expect(validateColor('#ABC').ok).toBe(true);
      expect(validateColor('#123').ok).toBe(true);
    });

    it('#RGBA(4자리)를 허용해야 한다', () => {
      expect(validateColor('#abcd').ok).toBe(true);
      expect(validateColor('#1234').ok).toBe(true);
    });

    it('#RRGGBB(6자리)를 허용해야 한다', () => {
      expect(validateColor('#FAFAF7').ok).toBe(true);
      expect(validateColor('#1A1A1A').ok).toBe(true);
      expect(validateColor('#0a66c2').ok).toBe(true);
    });

    it('#RRGGBBAA(8자리)를 허용해야 한다', () => {
      expect(validateColor('#1A1A1Aff').ok).toBe(true);
      expect(validateColor('#FAFAF780').ok).toBe(true);
    });

    it('#12345(5자리) HEX를 거부해야 한다 (3/4/6/8만 허용)', () => {
      expect(validateColor('#12345').ok).toBe(false);
    });

    it('#1234567(7자리) HEX를 거부해야 한다', () => {
      expect(validateColor('#1234567').ok).toBe(false);
    });

    it('#abc1(4자리 #RGBA)은 허용해야 한다', () => {
      expect(validateColor('#abc1').ok).toBe(true);
    });

    it('잘못된 HEX 문자가 포함된 경우 거부해야 한다', () => {
      expect(validateColor('#GGGGGG').ok).toBe(false);
    });
  });

  describe('rgb/rgba 색상', () => {
    it('rgb(r,g,b)를 허용해야 한다', () => {
      expect(validateColor('rgb(255, 0, 0)').ok).toBe(true);
      expect(validateColor('rgb(0,0,0)').ok).toBe(true);
    });

    it('rgba(r,g,b,a)를 허용해야 한다 (알파 0~1)', () => {
      expect(validateColor('rgba(0, 0, 0, 0.5)').ok).toBe(true);
      expect(validateColor('rgba(51,51,51,0.92)').ok).toBe(true);
      expect(validateColor('rgba(0,0,0,0)').ok).toBe(true);
      expect(validateColor('rgba(255,255,255,1)').ok).toBe(true);
    });

    it('공백이 포함된 rgb를 허용해야 한다', () => {
      expect(validateColor('rgb( 255 , 0 , 0 )').ok).toBe(true);
    });
  });

  describe('hsl/hsla 색상', () => {
    it('hsl(h,s%,l%)를 허용해야 한다', () => {
      expect(validateColor('hsl(120, 100%, 50%)').ok).toBe(true);
      expect(validateColor('hsl(0,0%,100%)').ok).toBe(true);
    });

    it('hsla(h,s%,l%,a)를 허용해야 한다', () => {
      expect(validateColor('hsla(120, 100%, 50%, 0.5)').ok).toBe(true);
      expect(validateColor('hsla(0,0%,0%,1)').ok).toBe(true);
    });
  });

  describe('CSS named 색상', () => {
    it('red/blue/transparent/currentColor을 허용해야 한다', () => {
      expect(validateColor('red').ok).toBe(true);
      expect(validateColor('blue').ok).toBe(true);
      expect(validateColor('transparent').ok).toBe(true);
      expect(validateColor('currentColor').ok).toBe(true);
    });

    it('대소문자를 구분하지 않아야 한다', () => {
      expect(validateColor('RED').ok).toBe(true);
      expect(validateColor('Blue').ok).toBe(true);
      expect(validateColor('TRANSPARENT').ok).toBe(true);
    });

    it('존재하지 않는 색상 이름을 거부해야 한다', () => {
      expect(validateColor('notacolor').ok).toBe(false);
      expect(validateColor('fakecolor').ok).toBe(false);
    });
  });

  it('빈 문자열을 거부해야 한다', () => {
    expect(validateColor('').ok).toBe(false);
  });

  it('비문자열을 거부해야 한다', () => {
    expect(validateColor(123).ok).toBe(false);
    expect(validateColor(null).ok).toBe(false);
    expect(validateColor(undefined).ok).toBe(false);
  });

  it('거부 시 reason을 포함해야 한다', () => {
    const result = validateColor('notacolor');
    expect(result.ok).toBe(false);
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });
});

describe('validateThemePack', () => {
  const validRaw = {
    name: 'Test',
    light: { ...FALLBACK_TOKENS },
    dark: { ...FALLBACK_TOKENS },
    shiki: { light: 'github-light', dark: 'github-dark' },
  };

  // dark 모드용 별도 폴백 (CR12-W1 — light/dark 분리 검증용)
  const DARK_FALLBACK_TOKENS: ThemeTokens = {
    ...FALLBACK_TOKENS,
    'color.bg': '#1C1C1E',
    'color.text': '#E5E5E7',
  };

  it('유효한 팩을 그대로 반환해야 한다', () => {
    const result = validateThemePack(validRaw, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS);
    expect(result.pack.name).toBe('Test');
    expect(result.warnings).toHaveLength(0);
  });

  it('잘못된 색상 키 → fallback 값 + warning 포함해야 한다', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const rawWithBadColor = {
      ...validRaw,
      light: { ...FALLBACK_TOKENS, 'color.bg': 'not-a-color' },
    };

    const result = validateThemePack(rawWithBadColor, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS);
    expect(result.pack.light['color.bg']).toBe(FALLBACK_TOKENS['color.bg']); // fallback
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.key).toContain('color.bg');
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('정상 키는 그대로 유지되어야 한다 (폴백은 오류 키만)', () => {
    const rawWithOneBadColor = {
      ...validRaw,
      light: { ...FALLBACK_TOKENS, 'color.link': 'bad-color', 'color.bg': '#FF0000' },
    };

    const result = validateThemePack(rawWithOneBadColor, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS);
    expect(result.pack.light['color.bg']).toBe('#FF0000'); // 정상 키 유지
    expect(result.pack.light['color.link']).toBe(FALLBACK_TOKENS['color.link']); // 오류 키만 폴백
  });

  // CR12-W1: dark 섹션 잘못된 색은 dark fallback으로 폴백되어야 한다 (light fallback 오염 방지)
  it('dark 섹션 잘못된 색 → dark fallback (light fallback 오염 0)', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const rawWithBadDark = {
      ...validRaw,
      dark: { ...FALLBACK_TOKENS, 'color.bg': 'not-a-color' },
    };

    const result = validateThemePack(rawWithBadDark, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS);
    expect(result.pack.dark['color.bg']).toBe(DARK_FALLBACK_TOKENS['color.bg']); // dark fallback
    expect(result.pack.dark['color.bg']).not.toBe(FALLBACK_TOKENS['color.bg']); // light fallback이면 흰색 시각 버그
    expect(result.warnings.some((w) => w.key === 'dark.color.bg')).toBe(true);

    consoleWarnSpy.mockRestore();
  });

  it('schema 깨짐(name 누락) → null 또는 throw', () => {
    const rawNoName = { light: FALLBACK_TOKENS, dark: FALLBACK_TOKENS, shiki: { light: 'github-light', dark: 'github-dark' } };
    expect(() => validateThemePack(rawNoName, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS)).toThrow();
  });

  it('schema 깨짐(light 누락) → throw', () => {
    const rawNoLight = { name: 'Test', dark: FALLBACK_TOKENS, shiki: { light: 'github-light', dark: 'github-dark' } };
    expect(() => validateThemePack(rawNoLight, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS)).toThrow();
  });

  it('schema 깨짐(dark 누락) → throw', () => {
    const rawNoDark = { name: 'Test', light: FALLBACK_TOKENS, shiki: { light: 'github-light', dark: 'github-dark' } };
    expect(() => validateThemePack(rawNoDark, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS)).toThrow();
  });

  it('schema 깨짐(shiki 누락) → throw', () => {
    const rawNoShiki = { name: 'Test', light: FALLBACK_TOKENS, dark: FALLBACK_TOKENS };
    expect(() => validateThemePack(rawNoShiki, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS)).toThrow();
  });

  it('null input → throw', () => {
    expect(() => validateThemePack(null, FALLBACK_TOKENS, DARK_FALLBACK_TOKENS)).toThrow();
  });
});
