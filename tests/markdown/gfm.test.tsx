// 사후 RTL — AC3~AC6 한 번에 커버
// AC3: 표 thead/tbody 구조 + 정렬 className
// AC4: ~~strike~~ → <del>
// AC5: ul/ol/li, nested, ordered start 보존
// AC6: autolink (angle / linkify bare) → <a target=_blank rel="noreferrer noopener">
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/src/markdown/MarkdownRenderer';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';
import type { MarkdownDocument } from '@shared/markdown';

function mkDoc(rawText: string): MarkdownDocument {
  return parseMarkdown(rawText, undefined);
}

// ===== AC3: 표 구조 + 정렬 className =====
describe('AC3 — Table 구조 및 정렬 className', () => {
  const tableInput = `| left | center | right |
|:-----|:------:|------:|
| a    | b      | c     |
`;

  it('<table> 요소가 렌더됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('<thead> 요소가 렌더됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    expect(container.querySelector('thead')).not.toBeNull();
  });

  it('<tbody> 요소가 렌더됨', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    expect(container.querySelector('tbody')).not.toBeNull();
  });

  it('thead의 <tr> 안에 <th> 셀이 3개', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const ths = container.querySelectorAll('thead th');
    expect(ths).toHaveLength(3);
  });

  it('<th scope="col"> 접근성 attr 존재', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const ths = container.querySelectorAll('thead th');
    ths.forEach((th) => {
      expect(th.getAttribute('scope')).toBe('col');
    });
  });

  it('첫 번째 th: align-left className', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const ths = container.querySelectorAll('thead th');
    expect(ths[0]?.classList.contains('align-left')).toBe(true);
  });

  it('두 번째 th: align-center className', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const ths = container.querySelectorAll('thead th');
    expect(ths[1]?.classList.contains('align-center')).toBe(true);
  });

  it('세 번째 th: align-right className', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const ths = container.querySelectorAll('thead th');
    expect(ths[2]?.classList.contains('align-right')).toBe(true);
  });

  it('tbody의 td에도 정렬 className 부여 (스파이크 Q2: td_open에도 일관 부여 확인)', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const tds = container.querySelectorAll('tbody td');
    expect(tds[0]?.classList.contains('align-left')).toBe(true);
    expect(tds[1]?.classList.contains('align-center')).toBe(true);
    expect(tds[2]?.classList.contains('align-right')).toBe(true);
  });

  it('tbody 첫 번째 행의 td 텍스트가 정확함', () => {
    const { container } = render(<MarkdownRenderer document={mkDoc(tableInput)} />);
    const tds = container.querySelectorAll('tbody td');
    expect(tds[0]?.textContent?.trim()).toBe('a');
    expect(tds[1]?.textContent?.trim()).toBe('b');
    expect(tds[2]?.textContent?.trim()).toBe('c');
  });
});

// ===== AC4: ~~strikethrough~~ → <del> =====
describe('AC4 — Strikethrough', () => {
  it('~~strike~~ → <del> 요소', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('문장 ~~취소선~~ 포함\n')} />,
    );
    const del = container.querySelector('del');
    expect(del).not.toBeNull();
    expect(del?.textContent).toBe('취소선');
  });

  it('전체 문단이 del인 경우에도 렌더됨', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('~~전체 문단 취소~~\n')} />,
    );
    expect(container.querySelector('del')).not.toBeNull();
    expect(container.querySelector('del')?.textContent).toBe('전체 문단 취소');
  });
});

// ===== AC5: ul/ol/li, nested, ordered start 보존 =====
describe('AC5 — List / ListItem', () => {
  it('- a\\n- b → <ul><li>a</li><li>b</li></ul>', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('- 사과\n- 바나나\n')} />,
    );
    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
    const lis = ul?.querySelectorAll(':scope > li');
    expect(lis).toHaveLength(2);
    expect(lis?.[0]?.textContent?.trim()).toBe('사과');
    expect(lis?.[1]?.textContent?.trim()).toBe('바나나');
  });

  it('1. a\\n2. b → <ol><li>...</li></ol>', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('1. 첫번째\n2. 두번째\n')} />,
    );
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const lis = ol?.querySelectorAll(':scope > li');
    expect(lis).toHaveLength(2);
  });

  it('ordered start 보존: 3. a → <ol start="3">', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('3. 세번째\n4. 네번째\n')} />,
    );
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    expect(ol?.getAttribute('start')).toBe('3');
  });

  it('nested ul: - a\\n  - b → 중첩 <ul>', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('- 과일\n  - 사과\n  - 바나나\n')} />,
    );
    const outerUl = container.querySelector('ul');
    expect(outerUl).not.toBeNull();
    const innerUl = outerUl?.querySelector('ul');
    expect(innerUl).not.toBeNull();
    const innerLis = innerUl?.querySelectorAll(':scope > li');
    expect(innerLis).toHaveLength(2);
  });

  it('nested ul 안의 텍스트가 정확함', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('- 과일\n  - 사과\n  - 바나나\n')} />,
    );
    const innerLis = container.querySelectorAll('ul ul li');
    expect(innerLis[0]?.textContent?.trim()).toBe('사과');
    expect(innerLis[1]?.textContent?.trim()).toBe('바나나');
  });
});

// ===== AC6: autolink → <a target=_blank rel="noreferrer noopener"> =====
describe('AC6 — Autolink (Link.tsx 재사용)', () => {
  it('angle bracket <https://example.com> → <a> 렌더', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('<https://example.com>\n')} />,
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://example.com');
  });

  it('angle bracket autolink → target=_blank rel="noreferrer noopener"', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('<https://example.com>\n')} />,
    );
    const a = container.querySelector('a');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('bare URL https://example.com (linkify) → <a> 렌더', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('Visit https://example.com please.\n')} />,
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://example.com');
  });

  it('bare URL (linkify) → target=_blank rel="noreferrer noopener"', () => {
    const { container } = render(
      <MarkdownRenderer document={mkDoc('Visit https://example.com please.\n')} />,
    );
    const a = container.querySelector('a');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noreferrer noopener');
  });
});

// ===== 스냅샷 — gfm-sample.md 전체 렌더 =====
describe('스냅샷 — GFM 복합 렌더링', () => {
  it('표 + 체크박스 + 취소선 + 리스트 복합 렌더 — article 존재', () => {
    const combined = `| h1 | h2 |
|---|---|
| a | b |

- [x] 완료
- [ ] 미완료

~~취소선~~

- 리스트 a
  - 중첩 b
`;
    const { container } = render(<MarkdownRenderer document={mkDoc(combined)} />);
    expect(container.querySelector('article')).not.toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.querySelector('del')).not.toBeNull();
    expect(container.querySelector('ul')).not.toBeNull();
  });
});
