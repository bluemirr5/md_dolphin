// TDD R2 — task list 체크박스 보안
// - "- [ ] todo" → <input type="checkbox" disabled> (no checked)
// - "- [x] done" → <input type="checkbox" disabled checked>
// - 두 케이스 모두 disabled 양성 (편집 불가)
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/src/markdown/MarkdownRenderer';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';
import type { MarkdownDocument } from '@shared/markdown';

function mkDoc(rawText: string): MarkdownDocument {
  return parseMarkdown(rawText, undefined);
}

describe('R2 — task list 체크박스 보안', () => {
  it('"- [ ] todo" → <input type="checkbox" disabled> (unchecked)', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('- [ ] todo\n')} />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect(input?.hasAttribute('disabled')).toBe(true);
    expect(input?.hasAttribute('checked')).toBe(false);
  });

  it('"- [x] done" → <input type="checkbox" disabled checked>', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('- [x] done\n')} />);
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(true);
    expect(input?.checked).toBe(true);
  });

  it('두 체크박스 모두 disabled (편집 불가)', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('- [ ] todo\n- [x] done\n')} />,
    );
    const inputs = container.querySelectorAll('input[type="checkbox"]');
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => {
      expect(input.hasAttribute('disabled')).toBe(true);
    });
  });

  it('체크박스 이후 텍스트가 li 안에 표시됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('- [ ] todo\n')} />);
    const li = container.querySelector('li');
    expect(li).not.toBeNull();
    expect(li?.textContent).toContain('todo');
  });

  it('task-list-item 클래스가 li에 부여됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc('- [x] done\n')} />);
    const li = container.querySelector('li.task-list-item');
    expect(li).not.toBeNull();
  });
});
