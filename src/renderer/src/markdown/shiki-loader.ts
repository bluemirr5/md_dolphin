// shiki-loader.ts — lazy loadLanguage + in-flight 캐시 + deny-list
// 사이클 9 AC7: 첫 코드블록 mount 시 loadLanguage 1회, 동일 lang 재mount 시 0회
// 무한 재시도 차단: lang 1개당 실패 1회 기록 후 plain text 폴백, 세션 deny-list
import { createHighlighter } from 'shiki';
import type { Highlighter } from 'shiki';

// dual theme — 사이클 6 확립 (P6-4)
const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';

// 싱글턴 highlighter Promise — langs:[] 빈 시작 (lazy loadLanguage)
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighterInstance(): Promise<Highlighter> {
  if (highlighterPromise === null) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [], // 빈 시작 — 코드블록 mount 시 lang 단위 loadLanguage 동적 호출
    }).catch((err: unknown) => {
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

// lang 단위 in-flight Promise 캐시 — 동시 동일 lang 요청 시 1회만 loadLanguage 호출
const langLoadingCache = new Map<string, Promise<void>>();

// 세션 단위 deny-list — 실패한 lang은 등록 후 재시도 차단
const langDenyList = new Set<string>();

/**
 * lang을 동적으로 로드한다.
 * - 이미 로드됨: no-op
 * - deny-list: 즉시 반환 (재시도 차단)
 * - in-flight: 기존 Promise 대기
 * - 최초: loadLanguage 호출 후 캐시 등록
 */
async function loadLang(highlighter: Highlighter, lang: string): Promise<void> {
  if (langDenyList.has(lang)) return;

  const existing = langLoadingCache.get(lang);
  if (existing !== undefined) {
    await existing;
    // CR9-8: 동시 대기자가 catch 완료 후 deny-list 적용됐는지 재확인
    // loadPromise.catch에서 langDenyList.add → 대기 완료 후 deny-list 적용됨을 보장
    if (langDenyList.has(lang)) return;
    return;
  }

  const loadPromise = highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]).catch((err: unknown) => {
    console.warn(`[shiki] lang 로드 실패: ${lang}`, err);
    langDenyList.add(lang);
    langLoadingCache.delete(lang);
  });

  langLoadingCache.set(lang, loadPromise);
  await loadPromise;
}

/**
 * 코드 문자열을 shiki로 하이라이팅하여 HTML 문자열 반환.
 * - lang이 undefined/빈 문자열이면 → null
 * - deny-list에 있는 lang → null (plain text 폴백)
 * - highlighter 로드 실패 → console.warn + null
 * - 빈 코드/공백만 → null
 */
export async function highlightCode(
  code: string,
  lang: string | undefined,
): Promise<string | null> {
  if (lang === undefined || lang.trim() === '') return null;
  if (code.trim() === '') return null;

  const normalizedLang = lang.trim().toLowerCase();

  // deny-list 조기 탈출 — loadLanguage 시도 없이 plain text 폴백
  if (langDenyList.has(normalizedLang)) return null;

  let highlighter: Highlighter;
  try {
    highlighter = await getHighlighterInstance();
  } catch (err: unknown) {
    console.warn('[shiki] highlighter 로드 실패:', err);
    return null;
  }

  // lang 동적 로드 (in-flight 캐시 + deny-list 적용)
  await loadLang(highlighter, normalizedLang);

  // deny-list에 추가됐으면 plain text 폴백
  if (langDenyList.has(normalizedLang)) return null;

  try {
    const html = highlighter.codeToHtml(code, {
      lang: normalizedLang,
      themes: {
        light: LIGHT_THEME,
        dark: DARK_THEME,
      },
    });
    return html;
  } catch {
    // codeToHtml 실패 — deny-list 추가
    langDenyList.add(normalizedLang);
    return null;
  }
}

/** 테스트용: deny-list와 캐시를 초기화한다 (세션 단위 격리) */
export function _resetForTest(): void {
  langDenyList.clear();
  langLoadingCache.clear();
  highlighterPromise = null;
}
