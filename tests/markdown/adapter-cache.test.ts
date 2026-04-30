import { describe, it, expect } from 'vitest';
import { parseMarkdown, getCachedTokens } from '../../src/renderer/src/markdown/adapter';
import type { MarkdownDocument } from '@shared/markdown/document';

describe('R2 — adapter WeakMap 캐시 + export 동결 (부채 ②)', () => {
  it('parseMarkdown 후 getCachedTokens → 토큰 배열 반환', () => {
    const doc = parseMarkdown('# 제목\n\n문단입니다.\n', undefined);
    const tokens = getCachedTokens(doc);
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('getCachedTokens 2회 호출 → 동일 배열 참조 (캐시 hit)', () => {
    const doc = parseMarkdown('# 테스트\n', undefined);
    const tokens1 = getCachedTokens(doc);
    const tokens2 = getCachedTokens(doc);
    expect(tokens1).toBe(tokens2); // 동일 참조
  });

  it('캐시 miss(직접 생성한 MarkdownDocument) → fallback 파싱으로 토큰 반환', () => {
    const rawText = '# 헤딩\n\n문단\n';
    const manualDoc: MarkdownDocument = {
      url: undefined,
      rawText,
      headings: [],
      outline: { root: [] },
    };
    const tokens = getCachedTokens(manualDoc);
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    // heading_open 토큰이 있어야 함
    const hasHeadingOpen = tokens.some((t) => t.type === 'heading_open');
    expect(hasHeadingOpen).toBe(true);
  });

  it('캐시 miss — 빈 rawText이면 빈 배열 반환', () => {
    const emptyDoc: MarkdownDocument = {
      url: undefined,
      rawText: '',
      headings: [],
      outline: { root: [] },
    };
    const tokens = getCachedTokens(emptyDoc);
    expect(tokens).toEqual([]);
  });

  it('AC3: renderTokens는 adapter 모듈 export에 존재하지 않음', async () => {
    const adapterModule = await import('../../src/renderer/src/markdown/adapter');
    // renderTokens가 export되지 않아야 함
    expect((adapterModule as Record<string, unknown>)['renderTokens']).toBeUndefined();
  });

  it('AC3: parseMarkdown과 getCachedTokens는 export됨', async () => {
    const adapterModule = await import('../../src/renderer/src/markdown/adapter');
    expect(typeof adapterModule.parseMarkdown).toBe('function');
    expect(typeof adapterModule.getCachedTokens).toBe('function');
  });

  it('AC3: 함수 export 화이트리스트 — parseMarkdown + getCachedTokens 2개만', async () => {
    const mod = await import('../../src/renderer/src/markdown/adapter');
    const fnExports = Object.keys(mod).filter(
      (k) => typeof (mod as Record<string, unknown>)[k] === 'function',
    );
    expect(fnExports.sort()).toEqual(['getCachedTokens', 'parseMarkdown']);
  });
});
