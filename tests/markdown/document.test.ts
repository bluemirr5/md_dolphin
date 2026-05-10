import { describe, it, expectTypeOf } from 'vitest';
import type { MarkdownDocument } from '@shared/markdown';

describe('MarkdownDocument 타입 (AC1)', () => {
  it('url 필드는 string | undefined 타입이어야 한다 (NOT url?: string)', () => {
    const doc: MarkdownDocument = {
      url: undefined,
      rawText: '',
      headings: [],
      outline: { root: [] },
    };
    // exactOptionalPropertyTypes 환경에서 url: string | undefined로 선언되어야 함
    expectTypeOf(doc.url).toMatchTypeOf<string | undefined>();
  });

  it('headings는 readonly Heading[] 타입이어야 한다', () => {
    const doc: MarkdownDocument = {
      url: 'file:///test.md',
      rawText: '# hello',
      headings: [{ level: 1, text: 'hello', anchor: 'hello', offset: 0 }],
      outline: { root: [] },
    };
    expectTypeOf(doc.headings).toMatchTypeOf<readonly { level: number; text: string }[]>();
  });
});
