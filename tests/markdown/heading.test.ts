// R1: 타입 import 가능 여부 확인 (AC1)
import { describe, it, expectTypeOf } from 'vitest';
import type { Heading, HeadingLevel, Outline, OutlineNode } from '@shared/markdown';

describe('R1 — Heading / Outline / OutlineNode 타입', () => {
  it('Heading 타입을 import할 수 있다', () => {
    const heading: Heading = {
      level: 1,
      text: '제목',
      anchor: 'title',
      offset: 0,
    };
    expectTypeOf(heading.level).toMatchTypeOf<HeadingLevel>();
    expectTypeOf(heading.text).toMatchTypeOf<string>();
    expectTypeOf(heading.anchor).toMatchTypeOf<string>();
    expectTypeOf(heading.offset).toMatchTypeOf<number>();
  });

  it('OutlineNode 타입을 import할 수 있다', () => {
    const heading: Heading = { level: 2, text: '소제목', anchor: 'sub', offset: 10 };
    const node: OutlineNode = { heading, children: [] };
    expectTypeOf(node.children).toMatchTypeOf<readonly OutlineNode[]>();
  });

  it('Outline 타입을 import할 수 있다', () => {
    const outline: Outline = { root: [] };
    expectTypeOf(outline.root).toMatchTypeOf<readonly OutlineNode[]>();
  });

  it('HeadingLevel은 1~6만 허용한다', () => {
    // 타입 레벨 검증 — 컴파일 타임에 보장됨
    const level: HeadingLevel = 3;
    expectTypeOf(level).toMatchTypeOf<1 | 2 | 3 | 4 | 5 | 6>();
  });
});
