// R2 TDD: DOMPurify sanitizeShikiHtml
// AC2: shiki dual <span style> 통과, <script>/on*/임의 CSS strip, 공백·순서·신규 변수 강건
// 환경: jsdom (vitest environmentMatchGlobs 'tests/markdown/**' → jsdom)

import { describe, it, expect } from 'vitest';
import { sanitizeShikiHtml } from '../../src/renderer/src/markdown/sanitize';

describe('sanitizeShikiHtml — shiki 정상 출력 통과', () => {
  it('shiki dual span style 통과 — --shiki-light + --shiki-dark', () => {
    const input = '<pre class="shiki"><code><span style="--shiki-light:#005cc5;--shiki-dark:#79b8ff">const</span></code></pre>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('--shiki-light:#005cc5');
    expect(result).toContain('--shiki-dark:#79b8ff');
    expect(result).toContain('const');
  });

  it('color:#abc 단독 style 통과', () => {
    const input = '<span style="color:#abc">text</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('color:#abc');
    expect(result).toContain('text');
  });

  it('color 긴 hex(#aabbcc) 통과', () => {
    const input = '<span style="color:#aabbcc">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('color:#aabbcc');
  });

  it('color 8자리 hex(#aabbccdd) 통과', () => {
    const input = '<span style="color:#aabbccdd">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('color:#aabbccdd');
  });

  it('pre + code + span 중첩 구조 보존', () => {
    const input = '<pre class="shiki"><code><span style="--shiki-light:#e36209;--shiki-dark:#ffab70">foo</span></code></pre>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('<pre');
    expect(result).toContain('<code');
    expect(result).toContain('<span');
    expect(result).toContain('foo');
  });
});

describe('sanitizeShikiHtml — 위험 요소 제거', () => {
  it('<script> 태그를 strip한다', () => {
    const input = '<script>alert(1)</script>';
    const result = sanitizeShikiHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });

  it('<span onerror="..."> 이벤트 핸들러 속성을 strip한다', () => {
    const input = '<span onerror="evil()">text</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).toContain('text'); // span 자체는 유지
  });

  it('background:url(...) style을 strip한다', () => {
    const input = '<span style="background:url(http://evil.com/x)">text</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).not.toContain('background');
    // style 자체가 strip되어 <span> 만 남거나 style 없이 남아야 함
    expect(result).toContain('text');
  });

  it('font-family style을 strip한다', () => {
    const input = '<span style="font-family:Arial">text</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).not.toContain('font-family');
    expect(result).toContain('text');
  });
});

describe('sanitizeShikiHtml — 부분 strip (통과 declaration만 살아남음)', () => {
  it('공백 변형 허용 — --shiki-light: #abc; --shiki-dark: #def (공백 있음)', () => {
    const input = '<span style="--shiki-light: #abc; --shiki-dark: #def">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('--shiki-light');
    expect(result).toContain('--shiki-dark');
  });

  it('순서 역전 — --shiki-dark 먼저, --shiki-light 나중', () => {
    const input = '<span style="--shiki-dark:#79b8ff;--shiki-light:#005cc5">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('--shiki-dark:#79b8ff');
    expect(result).toContain('--shiki-light:#005cc5');
  });

  it('신규 변수 1개 추가 시 허용된 declaration만 살아남고 신규 변수는 strip', () => {
    // --shiki-unknown은 화이트리스트 외부 → strip
    const input = '<span style="--shiki-light:#abc;--shiki-unknown:red;--shiki-dark:#def">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('--shiki-light:#abc');
    expect(result).toContain('--shiki-dark:#def');
    expect(result).not.toContain('--shiki-unknown');
  });

  it('비허용 declaration 혼합 시 허용된 것만 유지', () => {
    const input = '<span style="color:#abc;background:red;--shiki-dark:#def">x</span>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('color:#abc');
    expect(result).not.toContain('background');
    expect(result).toContain('--shiki-dark:#def');
  });

  it('모든 declaration이 비허용이면 style 속성 자체가 strip된다', () => {
    const input = '<span style="background:red;font-size:99px">x</span>';
    const result = sanitizeShikiHtml(input);
    // style 속성이 남아있지 않아야 함
    expect(result).not.toContain('style=');
    expect(result).toContain('x');
  });
});

describe('sanitizeShikiHtml — 태그 화이트리스트', () => {
  it('pre/code/span 외 태그는 strip된다', () => {
    const input = '<div><p>hello</p></div>';
    const result = sanitizeShikiHtml(input);
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<p>');
    expect(result).toContain('hello');
  });

  it('pre/code/span은 허용된다', () => {
    const input = '<pre><code><span>ok</span></code></pre>';
    const result = sanitizeShikiHtml(input);
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
    expect(result).toContain('<span>');
  });
});
