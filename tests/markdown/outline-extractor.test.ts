// TDD R1 — outline-extractor.ts 단독 모듈
// 7개 케이스: 트리, H1→H3 점프, 중복 anchor, 한글 anchor, H5/H6 도메인 보존, 빈 입력, 인라인 평탄화
import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { extractOutline } from '../../src/renderer/src/markdown/outline-extractor';

function makeTokens(rawText: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  return md.parse(rawText, {});
}

describe('R1 — extractOutline 단독', () => {
  it('# A → ## B → ## C → # D : root 2개, B·C가 A children', () => {
    const raw = '# A\n## B\n## C\n# D\n';
    const tokens = makeTokens(raw);
    const { outline, headings } = extractOutline(raw, tokens);

    expect(outline.root).toHaveLength(2);
    expect(outline.root[0]!.heading.text).toBe('A');
    expect(outline.root[0]!.children).toHaveLength(2);
    expect(outline.root[0]!.children[0]!.heading.text).toBe('B');
    expect(outline.root[0]!.children[1]!.heading.text).toBe('C');
    expect(outline.root[1]!.heading.text).toBe('D');
    expect(headings).toHaveLength(4);
  });

  it('H1→H3 점프: H3가 H1의 child', () => {
    const raw = '# A\n### C\n# B\n';
    const tokens = makeTokens(raw);
    const { outline } = extractOutline(raw, tokens);

    expect(outline.root).toHaveLength(2);
    expect(outline.root[0]!.children).toHaveLength(1);
    expect(outline.root[0]!.children[0]!.heading.level).toBe(3);
  });

  it('중복 anchor → -N suffix', () => {
    const raw = '# Hello\n# Hello\n# Hello\n';
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(headings[0]!.anchor).toBe('hello');
    expect(headings[1]!.anchor).toBe('hello-1');
    expect(headings[2]!.anchor).toBe('hello-2');
  });

  it('한글 anchor 보존', () => {
    const raw = '## 헬로\n';
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(headings[0]!.anchor).toBe('헬로');
  });

  it('H5/H6 headings 배열 보존 + outline 트리 포함', () => {
    const raw = '# A\n##### B\n###### C\n';
    const tokens = makeTokens(raw);
    const { headings, outline } = extractOutline(raw, tokens);

    expect(headings).toHaveLength(3);
    expect(headings[1]!.level).toBe(5);
    expect(headings[2]!.level).toBe(6);
    // H5는 H1의 child, H6는 H5의 child (트리 계층 정직하게 반영)
    expect(outline.root[0]!.children).toHaveLength(1);
    expect(outline.root[0]!.children[0]!.heading.level).toBe(5);
    expect(outline.root[0]!.children[0]!.children[0]!.heading.level).toBe(6);
  });

  it('빈 입력 → { headings: [], outline: { root: [] } }', () => {
    const raw = '';
    const tokens = makeTokens(raw);
    const { headings, outline } = extractOutline(raw, tokens);

    expect(headings).toEqual([]);
    expect(outline).toEqual({ root: [] });
  });

  it('**[link](url)** 헤딩 → text 평탄화 (링크 마크업 strip)', () => {
    const raw = '## **[link](https://example.com)**\n';
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(headings[0]!.text).toBe('link');
  });

  it('이모지 전용 헤딩 → anchor = "section" 폴백', () => {
    const raw = '# 🎉\n';
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(headings[0]!.anchor).toBe('section');
  });

  it('이모지 헤딩 두 번 → "section", "section-1" 중복 suffix', () => {
    const raw = '# 🎉\n# 🚀\n';
    const tokens = makeTokens(raw);
    const { headings } = extractOutline(raw, tokens);

    expect(headings[0]!.anchor).toBe('section');
    expect(headings[1]!.anchor).toBe('section-1');
  });
});
