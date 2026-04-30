import { describe, it, expect, vi, beforeEach } from 'vitest';

// shiki 모듈 전체를 spy 할 수 있도록 vi.mock 먼저 선언
// vi.mock은 호이스팅되므로 import 순서와 무관하게 동작
vi.mock('shiki', async (importOriginal) => {
  // importOriginal() 반환: unknown — 명시 캐스팅 없이 spread
  const actual = await importOriginal();
  return {
    ...(actual as object),
    createHighlighter: vi.fn((actual as { createHighlighter: (...args: unknown[]) => unknown }).createHighlighter),
  };
});

describe('R1 — shiki highlighter 싱글턴 + 안전 fallback', () => {
  // 각 테스트 전에 모듈 캐시를 리셋하여 싱글턴 상태 초기화
  beforeEach(() => {
    vi.resetModules();
  });

  it('AC1-a: typescript 코드에 class="shiki" HTML 반환', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki');
    const result = await highlightCode('const x = 1', 'typescript');
    expect(result).not.toBeNull();
    expect(result).toContain('shiki');
  });

  it('AC1-b: 미지원 언어 → null 반환 (throw 없음)', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki');
    const result = await highlightCode('some code', 'unknownlang');
    expect(result).toBeNull();
  });

  it('AC1-c: 빈 문자열 → null 또는 빈 결과 (throw 없음)', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki');
    let threw = false;
    let result: string | null = null;
    try {
      result = await highlightCode('', 'typescript');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    // 결과는 null이거나 빈/최소 HTML — throw 없음이 핵심
    if (result !== null) {
      expect(typeof result).toBe('string');
    }
  });

  it('AC1-d: 공백만 있는 입력 → null 또는 빈 결과 (throw 없음)', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki');
    let threw = false;
    try {
      await highlightCode('   ', 'typescript');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('AC1-e: 동일 highlighter 인스턴스 2회 호출 시 createHighlighter 1회만 실행', async () => {
    const shikiMod = await import('shiki');
    const createHighlighterSpy = vi.spyOn(shikiMod, 'createHighlighter');

    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki');
    await highlightCode('const a = 1', 'typescript');
    await highlightCode('const b = 2', 'typescript');

    // 같은 모듈 인스턴스에서 2회 호출했으므로 createHighlighter는 1회만 실행
    expect(createHighlighterSpy).toHaveBeenCalledTimes(1);
  });
});
