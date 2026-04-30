import { createHighlighter } from 'shiki';
import type { Highlighter } from 'shiki';

// 지원할 언어 목록 — 정적 등록 (lazy loadLanguage는 사이클 9)
const SUPPORTED_LANGS = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'json',
  'markdown',
  'tsx',
  'jsx',
] as const;

// dual theme 등록 — CSS 변수 토글로 재하이라이트 없이 라이트/다크 전환 (Q5 결정형, P6-4)
// shiki 1.x `themes` 옵션에 { light, dark } 이름으로 등록하면
// 출력 HTML에 --shiki-dark 인라인 CSS 변수가 포함됨
const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';

// 모듈 스코프 싱글턴 — Promise 자체를 캐시하여 동시 다중 호출 시에도 1회만 생성
// createHighlighter는 비용이 높으므로(wasm 로드) 반드시 1회 실행 (설계 제약)
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise === null) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [...SUPPORTED_LANGS],
    }).catch((err: unknown) => {
      // 로드 실패 시 캐시를 null로 리셋하여 재시도 가능하게 함
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

/**
 * 코드 문자열을 shiki로 하이라이팅하여 HTML 문자열 반환.
 * - lang이 undefined/빈 문자열이면 → null
 * - 미지원 언어 → null
 * - highlighter 로드 실패 → console.warn + null
 * - 빈 코드/공백만 → null
 */
export async function highlightCode(
  code: string,
  lang: string | undefined,
): Promise<string | null> {
  if (lang === undefined || lang.trim() === '') return null;
  if (code.trim() === '') return null;

  let highlighter: Highlighter;
  try {
    highlighter = await getHighlighter();
  } catch (err: unknown) {
    console.warn('[shiki] highlighter 로드 실패:', err);
    return null;
  }

  try {
    const html = highlighter.codeToHtml(code, {
      lang,
      themes: {
        light: LIGHT_THEME,
        dark: DARK_THEME,
      },
    });
    return html;
  } catch {
    // 미지원 언어 또는 기타 오류 — plain fallback으로 null 반환
    return null;
  }
}
