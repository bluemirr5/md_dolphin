import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/src/markdown/MarkdownRenderer';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';
import type { MarkdownDocument } from '@shared/markdown';

// 헬퍼: 간단한 rawText로 MarkdownDocument 생성
function mkDoc(rawText: string): MarkdownDocument {
  return parseMarkdown(rawText, undefined);
}

describe('AC8 — <article> wrapper', () => {
  it('rawText가 비어도 <article>이 존재한다', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('')} />);
    expect(container.querySelector('article')).not.toBeNull();
  });

  it('rawText가 있을 때도 <article>이 존재한다', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('# 제목\n')} />);
    expect(container.querySelector('article')).not.toBeNull();
  });
});

describe('AC7 — 기본 HTML 요소 렌더링', () => {
  it('H1~H4가 h1~h4 요소로 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('# H1\n## H2\n### H3\n#### H4\n')} />,
    );
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.querySelector('h2')).not.toBeNull();
    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.querySelector('h4')).not.toBeNull();
  });

  it('문단이 <p>로 렌더링됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('일반 문단 텍스트\n')} />);
    expect(container.querySelector('p')).not.toBeNull();
    expect(container.querySelector('p')?.textContent).toContain('일반 문단 텍스트');
  });

  it('링크가 a[target=_blank][rel="noopener noreferrer"]로 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('[링크](https://example.com)\n')} />,
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noreferrer noopener');
    expect(link?.getAttribute('href')).toBe('https://example.com');
  });

  it('인라인 코드가 <code>로 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('`inline code`\n')} />,
    );
    expect(container.querySelector('code')).not.toBeNull();
    expect(container.querySelector('code')?.textContent).toBe('inline code');
  });

  it('코드블록이 pre>code로 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('```js\nconsole.log("hello");\n```\n')} />,
    );
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.querySelector('code')).not.toBeNull();
  });
});

describe('AC5 — script 태그 차단 (html:false 보안)', () => {
  it('<script>alert(1)</script> 입력 → article DOM에 script 태그 없음', () => {
    const rawText = '<script>alert(1)</script>\n\n문단\n';
    const { container } = render(<MarkdownRenderer document={mkDoc(rawText)} />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('이벤트 핸들러가 있는 HTML 태그도 차단됨', () => {
    const rawText = '<img src="x" onerror="alert(1)">\n';
    const { container } = render(<MarkdownRenderer document={mkDoc(rawText)} />);
    // html:false이므로 img가 DOM에 없어야 함
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('AC6 — H5/H6 렌더러에서 null 반환', () => {
  it('H5가 article DOM에 렌더링되지 않음', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('##### H5 제목\n')} />,
    );
    expect(container.querySelector('h5')).toBeNull();
  });

  it('H6가 article DOM에 렌더링되지 않음', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('###### H6 제목\n')} />,
    );
    expect(container.querySelector('h6')).toBeNull();
  });
});

describe('AC9 — CodeBlock props 타입', () => {
  it('language가 undefined이면 className 없이 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('```\ncode without lang\n```\n')} />,
    );
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    // language undefined → className 없음
    expect(code?.getAttribute('class')).toBeNull();
  });

  it('language가 있으면 className="language-xxx"로 렌더링됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('```typescript\nconst x = 1;\n```\n')} />,
    );
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.getAttribute('class')).toBe('language-typescript');
  });
});

describe('스냅샷 — 기본 렌더링', () => {
  it('헤딩 + 문단 조합 스냅샷', () => {
    const { container } = render(
      <MarkdownRenderer
        document={mkDoc('# 제목\n\n문단 내용입니다.\n\n## 소제목\n\n두 번째 문단.\n')}
      />,
    );
    // container 내에서 헤딩 확인 (screen은 document 전체를 검색하므로 다른 테스트 DOM과 충돌 가능)
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.querySelector('h2')).not.toBeNull();
    // article 내부에 p 태그 존재
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });
});
