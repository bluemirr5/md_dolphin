// TDD R1 — perf/benchmark.ts
// AC1: runBench 통계 단조성 + samples.length + 환경 메타 필드 존재
// serializeBench: 마크다운 표 형식 검증
import { describe, it, expect } from 'vitest';
import { runBench, serializeBench } from '../../src/renderer/src/perf/benchmark';

describe('R1 — runBench 통계', () => {
  it('samples.length === iters', () => {
    const result = runBench('noop', () => {}, 10);
    expect(result.samples).toHaveLength(10);
  });

  it('p50 ≤ p95 ≤ max 단조성', () => {
    const result = runBench('noop', () => {}, 50);
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.max);
  });

  it('mean이 양수 또는 0', () => {
    const result = runBench('noop', () => {}, 10);
    expect(result.mean).toBeGreaterThanOrEqual(0);
  });

  it('max가 samples 중 최댓값과 일치', () => {
    const result = runBench('noop', () => {}, 20);
    const actualMax = Math.max(...result.samples);
    expect(result.max).toBe(actualMax);
  });

  it('label이 결과에 포함된다', () => {
    const result = runBench('my-bench', () => {}, 5);
    expect(result.label).toBe('my-bench');
  });

  it('iters 1회도 정상 동작', () => {
    const result = runBench('single', () => {}, 1);
    expect(result.samples).toHaveLength(1);
    expect(result.p50).toBe(result.p95);
    expect(result.p95).toBe(result.max);
  });
});

describe('R1 — runBench 환경 메타', () => {
  it('env.node 필드가 있다', () => {
    const result = runBench('env-test', () => {}, 1);
    expect(result.env.node).toBeDefined();
    expect(typeof result.env.node).toBe('string');
  });

  it('env.platform 필드가 있다', () => {
    const result = runBench('env-test', () => {}, 1);
    expect(result.env.platform).toBeDefined();
    expect(typeof result.env.platform).toBe('string');
  });

  it('env.electron 필드가 있다 (undefined 허용 — node 환경)', () => {
    const result = runBench('env-test', () => {}, 1);
    // electron 환경에서는 string, node 테스트 환경에서는 undefined 가능
    expect('electron' in result.env).toBe(true);
  });
});

describe('R1 — serializeBench 마크다운 표', () => {
  it('헤더 행에 label / p50 / p95 / mean / max 포함', () => {
    const result = runBench('my-bench', () => {}, 10);
    const md = serializeBench([result]);
    expect(md).toContain('| label |');
    expect(md).toContain('p50');
    expect(md).toContain('p95');
    expect(md).toContain('mean');
    expect(md).toContain('max');
  });

  it('결과 행에 label이 포함된다', () => {
    const result = runBench('render-bench', () => {}, 5);
    const md = serializeBench([result]);
    expect(md).toContain('render-bench');
  });

  it('복수 결과가 각각 행으로 출력된다', () => {
    const r1 = runBench('bench-a', () => {}, 5);
    const r2 = runBench('bench-b', () => {}, 5);
    const md = serializeBench([r1, r2]);
    expect(md).toContain('bench-a');
    expect(md).toContain('bench-b');
  });

  it('마크다운 구분선(---|)이 포함된다', () => {
    const result = runBench('noop', () => {}, 5);
    const md = serializeBench([result]);
    expect(md).toMatch(/\|[-: ]+\|/);
  });

  it('env 메타 섹션이 포함된다', () => {
    const result = runBench('noop', () => {}, 5);
    const md = serializeBench([result]);
    expect(md).toContain('node');
    expect(md).toContain('platform');
  });
});
