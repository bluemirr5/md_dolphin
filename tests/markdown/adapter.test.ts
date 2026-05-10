import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';

describe('R2 — parseMarkdown 빈 입력 (AC2)', () => {
  it('빈 문자열 → { rawText:"", headings:[], outline:{root:[]} }', () => {
    const doc = parseMarkdown('', undefined);
    expect(doc.rawText).toBe('');
    expect(doc.headings).toEqual([]);
    expect(doc.outline).toEqual({ root: [] });
  });

  it('공백만 있는 문자열도 빈 문서 반환', () => {
    const doc = parseMarkdown('   \n  \n', undefined);
    expect(doc.headings).toEqual([]);
    expect(doc.outline.root).toHaveLength(0);
  });

  it('url 필드가 undefined로 보존됨', () => {
    const doc = parseMarkdown('', undefined);
    expect(doc.url).toBeUndefined();
  });

  it('url 문자열이 있으면 그대로 보존됨', () => {
    const doc = parseMarkdown('# hello', 'file:///test.md');
    expect(doc.url).toBe('file:///test.md');
  });
});

describe('R3 — 헤딩 추출 + offset 통합 (AC3)', () => {
  it('heading.offset === rawText.indexOf("# 헤딩텍스트")', () => {
    const rawText = '# 헤딩텍스트\n\n문단 내용\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.headings).toHaveLength(1);
    const heading = doc.headings[0];
    expect(heading).toBeDefined();
    expect(heading!.offset).toBe(rawText.indexOf('# 헤딩텍스트'));
  });

  it('두 번째 헤딩 offset이 정확한 문자 인덱스', () => {
    const rawText = '# 첫번째\n\n## 두번째\n\n문단\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.headings).toHaveLength(2);
    const h2 = doc.headings[1];
    expect(h2).toBeDefined();
    expect(h2!.offset).toBe(rawText.indexOf('## 두번째'));
  });

  it('헤딩 level이 정확히 추출됨', () => {
    const rawText = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.headings).toHaveLength(6);
    expect(doc.headings.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('헤딩 text에서 인라인 마크업이 평탄화됨', () => {
    const rawText = '## Hello [link](https://example.com)\n';
    const doc = parseMarkdown(rawText, undefined);
    const h = doc.headings[0];
    expect(h).toBeDefined();
    expect(h!.text).toBe('Hello link');
  });

  it('anchor는 lowercase + 공백→"-" + 특수문자 제거', () => {
    const rawText = '# Hello World!\n';
    const doc = parseMarkdown(rawText, undefined);
    const h = doc.headings[0];
    expect(h).toBeDefined();
    expect(h!.anchor).toBe('hello-world');
  });

  it('anchor 중복 시 -N suffix', () => {
    const rawText = '# 제목\n## 제목\n### 제목\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.headings[0]!.anchor).toBe('제목');
    expect(doc.headings[1]!.anchor).toBe('제목-1');
    expect(doc.headings[2]!.anchor).toBe('제목-2');
  });

  it('한글 anchor 보존', () => {
    const rawText = '# 한글 제목\n';
    const doc = parseMarkdown(rawText, undefined);
    const h = doc.headings[0];
    expect(h).toBeDefined();
    expect(h!.anchor).toBe('한글-제목');
  });
});

describe('R4 — Outline 트리 구성 (AC4)', () => {
  it('# A → ## B → ## C → # D : root 길이 2, B·C가 A의 children', () => {
    const rawText = '# A\n## B\n## C\n# D\n';
    const doc = parseMarkdown(rawText, undefined);
    const { root } = doc.outline;

    expect(root).toHaveLength(2);

    const nodeA = root[0];
    expect(nodeA).toBeDefined();
    expect(nodeA!.heading.text).toBe('A');
    expect(nodeA!.children).toHaveLength(2);
    expect(nodeA!.children[0]!.heading.text).toBe('B');
    expect(nodeA!.children[1]!.heading.text).toBe('C');

    const nodeD = root[1];
    expect(nodeD).toBeDefined();
    expect(nodeD!.heading.text).toBe('D');
    expect(nodeD!.children).toHaveLength(0);
  });

  it('H1→H3 점프 처리: H3가 H1의 child가 됨', () => {
    const rawText = '# A\n### C\n# B\n';
    const doc = parseMarkdown(rawText, undefined);
    const { root } = doc.outline;

    expect(root).toHaveLength(2);
    expect(root[0]!.children).toHaveLength(1);
    expect(root[0]!.children[0]!.heading.level).toBe(3);
  });

  it('형제 노드가 같은 레벨로 root에 배치됨', () => {
    const rawText = '# A\n# B\n# C\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.outline.root).toHaveLength(3);
    expect(doc.outline.root.every((n) => n.children.length === 0)).toBe(true);
  });

  it('빈 입력 → 빈 outline', () => {
    const doc = parseMarkdown('', undefined);
    expect(doc.outline.root).toHaveLength(0);
  });
});

describe('R6 — H5/H6 정책 (AC6 도메인)', () => {
  it('H5/H6가 headings 배열에 보존됨 (level 5, 6)', () => {
    const rawText = '##### H5 제목\n###### H6 제목\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.headings).toHaveLength(2);
    expect(doc.headings[0]!.level).toBe(5);
    expect(doc.headings[1]!.level).toBe(6);
  });

  it('H5/H6 outline에 포함됨', () => {
    const rawText = '# A\n##### B\n';
    const doc = parseMarkdown(rawText, undefined);
    expect(doc.outline.root[0]!.children).toHaveLength(1);
    expect(doc.outline.root[0]!.children[0]!.heading.level).toBe(5);
  });
});
