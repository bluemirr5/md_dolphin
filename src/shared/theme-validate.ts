// theme-validate.ts — 색상 화이트리스트 검증 + 팩 스키마 검증 (사이클 12 P12-3)
// 거부 정책: 잘못된 색은 default 동일 키 폴백 + warn. schema 깨짐은 팩 reject.
import type { ThemeTokens, ThemePack } from './theme-spec';
import { TOKEN_KEYS } from './theme-spec';

// ── 색상 정규식 ──────────────────────────────────────────────────────────────

/** #RGB / #RGBA / #RRGGBB / #RRGGBBAA */
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** rgb(r,g,b) / rgba(r,g,b,a) — 0~255 정수, 알파 0~1 */
const RGB_RE =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;

/** hsl(h,s%,l%) / hsla(h,s%,l%,a) — deg 옵션, 알파 0~1 */
const HSL_RE =
  /^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;

/**
 * CSS named 색상 약 150종 화이트리스트 (W3C CSS Color Level 4 named colors)
 * lowercase로 통일하여 비교.
 */
const CSS_NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure',
  'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood',
  'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson',
  'currentcolor', 'cyan',
  'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
  'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet',
  'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
  'firebrick', 'floralwhite', 'forestgreen', 'fuchsia',
  'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey',
  'honeydew', 'hotpink',
  'indianred', 'indigo', 'ivory',
  'khaki',
  'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral',
  'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
  'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
  'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
  'midnightblue', 'mintcream', 'mistyrose', 'moccasin',
  'navajowhite', 'navy',
  'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid',
  'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff',
  'peru', 'pink', 'plum', 'powderblue', 'purple',
  'rebeccapurple', 'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
  'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue',
  'tan', 'teal', 'thistle', 'tomato', 'transparent', 'turquoise',
  'violet',
  'wheat', 'white', 'whitesmoke',
  'yellow', 'yellowgreen',
]);

// ── ValidationResult ────────────────────────────────────────────────────────

export interface ValidationResult {
  readonly ok: boolean;
  readonly value: string;   // ok면 입력값 그대로, false면 fallback 값
  readonly reason?: string; // 거부 사유 (warn 로그용)
}

/**
 * 단일 색상 문자열을 검증한다.
 * - HEX #3/4/6/8자리
 * - rgb/rgba, hsl/hsla
 * - CSS named ~150종 + transparent + currentColor
 * - 타입이 string이 아닌 경우 즉시 거부
 */
export function validateColor(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, value: '', reason: `expected string, got ${typeof raw}` };
  }
  if (raw.trim() === '') {
    return { ok: false, value: '', reason: 'empty string' };
  }

  const trimmed = raw.trim();

  if (HEX_RE.test(trimmed)) return { ok: true, value: trimmed };
  if (RGB_RE.test(trimmed)) return { ok: true, value: trimmed };
  if (HSL_RE.test(trimmed)) return { ok: true, value: trimmed };
  if (CSS_NAMED_COLORS.has(trimmed.toLowerCase())) return { ok: true, value: trimmed };

  return {
    ok: false,
    value: '',
    reason: `"${trimmed}" is not a valid CSS color (expected hex #3/4/6/8, rgb/rgba, hsl/hsla, or named color)`,
  };
}

// ── ValidatedPack ────────────────────────────────────────────────────────────

export interface ValidatedPack {
  readonly pack: ThemePack;
  readonly warnings: readonly { key: string; reason: string }[];
}

/**
 * raw JSON 오브젝트를 ThemePack으로 검증한다.
 *
 * - schema 깨짐 (name/light/dark/shiki 누락): throw
 * - 잘못된 색상 키: fallback 동일 키 값으로 교체 + console.warn + warnings 배열에 기록
 * - id/source는 서비스 계층에서 주입되므로 여기서는 placeholder 사용
 *
 * fallbackLight/fallbackDark를 분리해 받는 이유 (P12-3 보강):
 * 사용자 JSON의 dark 섹션에 잘못된 색이 있을 때 light fallback으로 대체하면
 * 다크 모드에서 배경이 흰색이 되는 시각 버그가 발생한다.
 */
export function validateThemePack(
  raw: unknown,
  fallbackLight: ThemeTokens,
  fallbackDark: ThemeTokens,
): ValidatedPack {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('[theme-validate] schema error: expected object');
  }

  const rawObj = raw as Record<string, unknown>;

  if (typeof rawObj['name'] !== 'string' || rawObj['name'].trim() === '') {
    throw new Error('[theme-validate] schema error: missing or empty "name"');
  }
  if (typeof rawObj['light'] !== 'object' || rawObj['light'] === null) {
    throw new Error('[theme-validate] schema error: missing "light"');
  }
  if (typeof rawObj['dark'] !== 'object' || rawObj['dark'] === null) {
    throw new Error('[theme-validate] schema error: missing "dark"');
  }
  if (typeof rawObj['shiki'] !== 'object' || rawObj['shiki'] === null) {
    throw new Error('[theme-validate] schema error: missing "shiki"');
  }

  const shikiObj = rawObj['shiki'] as Record<string, unknown>;
  if (typeof shikiObj['light'] !== 'string' || typeof shikiObj['dark'] !== 'string') {
    throw new Error('[theme-validate] schema error: "shiki" must have light and dark string fields');
  }

  const warnings: { key: string; reason: string }[] = [];

  const lightRaw = rawObj['light'] as Record<string, unknown>;
  const darkRaw = rawObj['dark'] as Record<string, unknown>;

  const validatedLight = validateTokens(lightRaw, fallbackLight, rawObj['name'], 'light', warnings);
  const validatedDark = validateTokens(darkRaw, fallbackDark, rawObj['name'], 'dark', warnings);

  const pack: ThemePack = {
    id: rawObj['id'] as string ?? '',
    name: rawObj['name'],
    source: (rawObj['source'] as 'builtin' | 'user') ?? 'user',
    light: validatedLight,
    dark: validatedDark,
    shiki: {
      light: shikiObj['light'],
      dark: shikiObj['dark'],
    },
  };

  return { pack, warnings };
}

/**
 * 토큰 객체를 검증하여 유효한 ThemeTokens를 반환한다.
 * 잘못된 키는 fallback으로 대체하고 warnings에 기록한다.
 */
function validateTokens(
  raw: Record<string, unknown>,
  fallback: ThemeTokens,
  packName: string,
  mode: 'light' | 'dark',
  warnings: { key: string; reason: string }[],
): ThemeTokens {
  const result: Partial<Record<keyof ThemeTokens, string>> = {};

  for (const key of TOKEN_KEYS) {
    const rawValue = raw[key];
    const validation = validateColor(rawValue);

    if (validation.ok) {
      result[key] = validation.value;
    } else {
      const reason = validation.reason ?? 'invalid color';
      warnings.push({ key: `${mode}.${key}`, reason });
      console.warn(`[theme-pack] ${packName}.${mode}.${key}: ${reason}`);
      result[key] = fallback[key];
    }
  }

  return result as ThemeTokens;
}
