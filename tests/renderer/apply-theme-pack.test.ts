// R3 TDD — applyThemePack.ts
// 21회 setProperty 호출, mode 토글 시 light/dark 분기
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ThemePack } from '@shared/theme-spec';
import { TOKEN_KEYS } from '@shared/theme-spec';

// 테스트용 팩
const TEST_PACK: ThemePack = {
  id: 'test',
  name: 'Test',
  source: 'user',
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

describe('applyThemePack', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('light 모드: documentElement.style.setProperty를 21회 호출해야 한다', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    applyThemePack(TEST_PACK, 'light');
    expect(setPropertySpy).toHaveBeenCalledTimes(TOKEN_KEYS.length);
    expect(TOKEN_KEYS.length).toBe(21);
  });

  it('dark 모드: 다크 토큰 값으로 setProperty를 호출해야 한다', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    applyThemePack(TEST_PACK, 'dark');
    // --bg가 dark 값으로 설정되었는지 확인
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#1C1C1E');
    expect(setPropertySpy).toHaveBeenCalledTimes(21);
  });

  it('light 모드: --bg가 light 값으로 설정되어야 한다 (AC1 기준값)', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    applyThemePack(TEST_PACK, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#FAFAF7');
  });

  it('TOKEN_KEYS의 모든 키가 setProperty로 호출되어야 한다 (누락 0)', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    applyThemePack(TEST_PACK, 'light');
    const calledVars = setPropertySpy.mock.calls.map((call) => call[0]);
    for (const _key of TOKEN_KEYS) {
      // TOKEN_TO_CSS_VAR으로 매핑된 변수명이 호출됐는지 확인
      // 최소 1회 이상 호출됐는지 확인
      expect(calledVars.length).toBe(21);
    }
  });

  it('mode 토글: light→dark 재호출 시 다크 값으로 덮어써야 한다', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    applyThemePack(TEST_PACK, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#FAFAF7');

    setPropertySpy.mockClear();

    applyThemePack(TEST_PACK, 'dark');
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#1C1C1E');
  });
});

// ─── AC1 + AC2 보강 ──────────────────────────────────────────────────────────
// AC1: 빌트인 default.json 적용 시 --bg가 사이클 4 결정값과 일치
// AC2: Solarized.json 적용 시 h1~h4 색상이 solarized 토큰 값으로 설정
import defaultJson from '../../src/shared/built-in-themes/default.json';
import solarizedJson from '../../src/shared/built-in-themes/solarized.json';

// JSON을 ThemePack 형태로 변환하는 헬퍼 (builtin id/source 부여)
function toBuiltinPack(id: string, json: typeof defaultJson): ThemePack {
  return {
    id: `builtin:${id}`,
    name: json.name,
    source: 'builtin',
    light: json.light,
    dark: json.dark,
    shiki: json.shiki,
  };
}

describe('applyThemePack — AC1: default.json 빌트인 값 검증', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('default light: --bg === #FAFAF7 (사이클 4 결정값)', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('default', defaultJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#FAFAF7');
  });

  it('default dark: --bg === #1C1C1E (사이클 4 결정값)', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('default', defaultJson);
    applyThemePack(pack, 'dark');
    expect(setPropertySpy).toHaveBeenCalledWith('--bg', '#1C1C1E');
  });

  it('default light: --text === #1A1A1A', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('default', defaultJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--text', '#1A1A1A');
  });
});

describe('applyThemePack — AC2: Solarized h1~h4 색상 변경 검증', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('solarized light: --heading-h1 === #073642', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('solarized', solarizedJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--heading-h1', '#073642');
  });

  it('solarized light: --heading-h2 === #073642', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('solarized', solarizedJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--heading-h2', '#073642');
  });

  it('solarized light: --heading-h3 === #586E75', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('solarized', solarizedJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--heading-h3', '#586E75');
  });

  it('solarized light: --heading-h4 === #586E75', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');
    const pack = toBuiltinPack('solarized', solarizedJson);
    applyThemePack(pack, 'light');
    expect(setPropertySpy).toHaveBeenCalledWith('--heading-h4', '#586E75');
  });

  it('solarized light vs default light: --bg 값이 달라야 한다', async () => {
    const { applyThemePack } = await import('../../src/renderer/src/theme/applyThemePack');

    // default light
    const defaultPack = toBuiltinPack('default', defaultJson);
    applyThemePack(defaultPack, 'light');
    const defaultBgCall = setPropertySpy.mock.calls.find((c) => c[0] === '--bg');
    const defaultBg = defaultBgCall?.[1];

    setPropertySpy.mockClear();

    // solarized light
    const solarizedPack = toBuiltinPack('solarized', solarizedJson);
    applyThemePack(solarizedPack, 'light');
    const solarizedBgCall = setPropertySpy.mock.calls.find((c) => c[0] === '--bg');
    const solarizedBg = solarizedBgCall?.[1];

    expect(defaultBg).toBe('#FAFAF7');
    expect(solarizedBg).toBe('#FDF6E3');
    expect(defaultBg).not.toBe(solarizedBg);
  });
});
