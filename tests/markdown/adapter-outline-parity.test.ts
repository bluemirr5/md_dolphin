// TDD R2 — adapter ↔ outline-extractor parity
// parseMarkdown 결과의 headings/outline = extractOutline 단독 호출 결과 (deep-equal)
import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';
import { extractOutline } from '../../src/renderer/src/markdown/outline-extractor';

function makeTokens(rawText: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  return md.parse(rawText, {});
}

describe('R2 — adapter ↔ outline-extractor parity', () => {
  it('단순 헤딩 문서: headings deep-equal', () => {
    const raw = '# 제목\n## 소제목\n\n내용\n';
    const doc = parseMarkdown(raw, undefined);
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(doc.headings).toEqual(headings);
  });

  it('단순 헤딩 문서: outline deep-equal', () => {
    const raw = '# 제목\n## 소제목\n\n내용\n';
    const doc = parseMarkdown(raw, undefined);
    const tokens = makeTokens(raw);
    const { outline } = extractOutline(raw, tokens);

    expect(doc.outline).toEqual(outline);
  });

  it('중복 anchor 문서: headings deep-equal', () => {
    const raw = '# 제목\n## 제목\n### 제목\n';
    const doc = parseMarkdown(raw, undefined);
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(doc.headings).toEqual(headings);
  });

  it('H5/H6 포함 문서: headings deep-equal', () => {
    const raw = '# A\n##### B\n###### C\n';
    const doc = parseMarkdown(raw, undefined);
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(doc.headings).toEqual(headings);
  });

  it('빈 문서: 양쪽 모두 headings=[], outline={root:[]}', () => {
    const raw = '';
    const doc = parseMarkdown(raw, undefined);
    const tokens = makeTokens(raw);
    const { headings, outline } = extractOutline(raw, tokens);

    expect(doc.headings).toEqual(headings);
    expect(doc.outline).toEqual(outline);
  });
});
