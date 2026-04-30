// 사후 RTL: AC8 Blockquote 컴포넌트 검증
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/src/markdown/MarkdownRenderer';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';

function mkDoc(rawText: string) {
  return parseMarkdown(rawText, undefined);
}

describe('Blockquote — 렌더링 (AC8)', () => {
  it('단일 blockquote가 <blockquote class="md-blockquote">로 렌더된다', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('> 인용문입니다.\n')} />,
    );
    const bq = container.querySelector('blockquote.md-blockquote');
    expect(bq).not.toBeNull();
    expect(bq?.textContent).toContain('인용문입니다.');
  });

  it('중첩 blockquote가 올바르게 렌더된다', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('> 외부\n>\n> > 내부\n')} />,
    );
    const blockquotes = container.querySelectorAll('blockquote.md-blockquote');
    // 중첩이므로 2개 이상의 blockquote가 존재해야 함
    expect(blockquotes.length).toBeGreaterThanOrEqual(2);
  });

  it('중첩 blockquote는 내부가 외부에 포함된다 (들여쓰기 누적)', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('> 외부\n>\n> > 내부\n')} />,
    );
    const outer = container.querySelector('blockquote.md-blockquote');
    const inner = outer?.querySelector('blockquote.md-blockquote');
    expect(inner).not.toBeNull();
  });
});
