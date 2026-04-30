// sanitize.ts — DOMPurify 기반 shiki HTML sanitizer
// 목적: shiki dangerouslySetInnerHTML 직전 1회 적용 (P2-2 + 부채 ④)
// 적용 대상: shiki 출력 <pre>/<code>/<span style="--shiki-*|color:#..."> 구조만
// task-list checkbox는 React 트리에서 완결 — DOMPurify 미경유 (cycle-06-html-inline-review 참조)
//
// DOMPurify 환경:
//   - renderer(Chromium): window 전역 DOMParser 사용
//   - test(jsdom/happy-dom): window가 globalThis에 주입되므로 동일 코드 동작
import DOMPurify from 'dompurify';

// 허용 태그 목록 — shiki 출력 구조에 필요한 3가지
const ALLOWED_TAGS = ['pre', 'code', 'span'];

// 허용 속성 목록 — class(shiki 테마 class), style(색상 변수)
const ALLOWED_ATTRS = ['class', 'style'];

// style 화이트리스트 함수 — 속성별 split + value 검증 (P7-2)
// 허용 prop: --shiki-light, --shiki-dark, color
// 허용 value: ^#[0-9a-fA-F]{3,8}$ (hex 색상만)
// 미통과 declaration은 drop. 모두 drop 시 style 속성 strip.
const ALLOWED_STYLE_PROPS = new Set(['--shiki-light', '--shiki-dark', 'color']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function filterStyleDeclarations(styleValue: string): string | null {
  // ';'로 declaration 분리 → 각각 검증 → 통과만 join
  const declarations = styleValue.split(';');
  const allowed: string[] = [];

  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (trimmed === '') continue;

    // 첫 ':' 기준으로 prop과 value 분리
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (ALLOWED_STYLE_PROPS.has(prop) && HEX_COLOR_RE.test(value)) {
      allowed.push(`${prop}:${value}`);
    }
    // 미통과 declaration은 drop
  }

  return allowed.length > 0 ? allowed.join(';') : null;
}

// DOMPurify 인스턴스 — 모듈 로드 시 1회 생성
// Chromium/jsdom 양쪽에서 globalThis.window 기반 DOMParser 사용
const purify = DOMPurify(window);

// uponSanitizeAttribute hook — style 값을 화이트리스트 함수로 재처리
// DOMPurify ALLOWED_ATTR에서 style을 허용한 후, hook에서 개별 declaration 필터링
// CR7-4: __strip__ 마커 대신 빈 문자열로 교체 → afterSanitizeAttributes에서 빈 style 제거
purify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    const filtered = filterStyleDeclarations(data.attrValue);
    if (filtered === null) {
      // 모든 declaration 비허용 → 빈 문자열로 교체 (afterSanitizeAttributes에서 제거)
      data.attrValue = '';
    } else {
      data.attrValue = filtered;
    }
  }
});

// afterSanitizeAttributes hook — 빈 style 속성을 element에서 완전 제거
// DOMPurify가 attrValue='' 로 설정한 style=""을 최종 정리
purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.getAttribute?.('style') === '') {
    node.removeAttribute('style');
  }
});

/**
 * shiki 출력 HTML을 DOMPurify로 sanitize한다.
 *
 * 허용: <pre>/<code>/<span>, class/style 속성
 * style 내 허용: --shiki-light/#hex, --shiki-dark/#hex, color/#hex
 * 그 외 태그·속성·style declaration은 strip.
 */
export function sanitizeShikiHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
  });
}
