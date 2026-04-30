import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/src/markdown/MarkdownRenderer';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';

function mkDoc(rawText: string) {
  return parseMarkdown(rawText, undefined);
}

describe('R2 — 인라인 재귀: 중첩 마크업 보존 (부채 ①)', () => {
  it('**[link](url)** → <strong> 안에 <a> 존재, link text 보존', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('**[링크텍스트](https://example.com)**\n')} />,
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    const anchor = strong?.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
    expect(anchor?.textContent).toContain('링크텍스트');
  });

  it('*~~취소선~~* → <em> 안에 <del> 존재, text 보존', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('*~~취소선~~*\n')} />,
    );
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    const del = em?.querySelector('del');
    expect(del).not.toBeNull();
    expect(del?.textContent).toContain('취소선');
  });

  it('**굵은** 텍스트에서 text 손실 없음', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('**bold text**\n')} />,
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toContain('bold text');
  });

  it('*이탤릭* 텍스트에서 text 손실 없음', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('*italic text*\n')} />,
    );
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toContain('italic text');
  });

  it('**[link](url)** — 링크 role 접근 가능', () => {
    render(
      <MarkdownRenderer document={mkDoc('**[접근가능링크](https://example.com)**\n')} />,
    );
    const link = screen.getByRole('link', { name: '접근가능링크' });
    expect(link).not.toBeNull();
    expect(link.closest('strong')).not.toBeNull();
  });
});
