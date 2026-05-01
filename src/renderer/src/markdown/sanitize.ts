// sanitize.ts — DOMPurify 기반 shiki HTML sanitizer
// 목적: shiki dangerouslySetInnerHTML 직전 1회 적용 (P2-2 + 부채 ④)
// 적용 대상: shiki 출력 <pre>/<code>/<span style="--shiki-*|color:#..."> 구조만
// task-list checkbox는 React 트리에서 완결 — DOMPurify 미경유 (cycle-06-html-inline-review 참조)
//
// CR7-9 흡수: DOMPurify 인스턴스를 모듈 로드 시→첫 호출 시 lazy 생성으로 전환
// SSR/Node 환경(typeof window === 'undefined')에서 import 해도 throw 없음
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

// DOMPurify 인스턴스 — 첫 호출 시 lazy 생성 (CR7-9 흡수)
let _purify: ReturnType<typeof DOMPurify> | null = null;

function getPurify(): ReturnType<typeof DOMPurify> {
  if (_purify !== null) return _purify;

  if (typeof window === 'undefined') {
    // SSR/Node 환경 — window 없음. sanitize 불가
    throw new Error('[sanitize] DOMPurify는 브라우저 환경에서만 사용 가능합니다');
  }

  // CR9-7: 인스턴스를 먼저 _purify에 할당 → hook 등록 전에 재진입해도 동일 인스턴스 반환
  // (JS 싱글스레드이므로 실제 race 가능성은 없으나, 코드 명확성 + 향후 microtask 방어)
  _purify = DOMPurify(window);

  // uponSanitizeAttribute hook — style 값을 화이트리스트 함수로 재처리
  // CR7-4: __strip__ 마커 대신 빈 문자열로 교체 → afterSanitizeAttributes에서 빈 style 제거
  _purify.addHook('uponSanitizeAttribute', (_node, data) => {
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
  _purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.getAttribute?.('style') === '') {
      node.removeAttribute('style');
    }
  });

  return _purify;
}

/**
 * shiki 출력 HTML을 DOMPurify로 sanitize한다.
 *
 * 허용: <pre>/<code>/<span>, class/style 속성
 * style 내 허용: --shiki-light/#hex, --shiki-dark/#hex, color/#hex
 * 그 외 태그·속성·style declaration은 strip.
 *
 * lazy 초기화: 첫 호출 시 DOMPurify 인스턴스 생성 (CR7-9)
 * 가상화 환경의 동적 mount 코드블록도 동일 경로 통과 (사이클 7 AC2 회귀 가드)
 */
export function sanitizeShikiHtml(html: string): string {
  return getPurify().sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
  });
}
