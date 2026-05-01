// perf/benchmark.ts — 성능 측정 유틸리티
// AC1: runBench(label, fn, iters) → { label, p50, p95, mean, max, samples, env }
// AC1: env에 node·electron·platform 포함 (process.versions 자동 수집)
// serializeBench: 복수 결과를 마크다운 표로 직렬화 (docs/benchmarks/ 기록용)

export interface BenchEnv {
  readonly node: string;
  readonly electron: string | undefined;
  readonly platform: string;
}

export interface BenchResult {
  readonly label: string;
  readonly p50: number;
  readonly p95: number;
  readonly mean: number;
  readonly max: number;
  readonly samples: readonly number[];
  readonly env: BenchEnv;
}

interface ProcessLike {
  versions?: { node?: string; electron?: string };
  platform?: string;
}

/** 환경 메타 수집 — process.versions 기반 (Electron/Node 양쪽 호환) */
function collectEnv(): BenchEnv {
  // renderer process에서는 process 전역 접근 — Electron은 contextIsolation 환경에서도 노출
  const proc = (globalThis as { process?: ProcessLike }).process;

  return {
    node: proc?.versions?.node ?? 'unknown',
    electron: proc?.versions?.electron,
    platform: proc?.platform ?? 'unknown',
  };
}

/**
 * 동기 함수 fn을 iters회 실행하고 각 실행의 경과 시간(ms)을 측정한다.
 * performance.now() 사용 — Node/Electron/Chromium 모두 지원.
 *
 * 통계:
 *  - p50: 정렬된 samples의 50번째 백분위수
 *  - p95: 정렬된 samples의 95번째 백분위수
 *  - mean: 산술 평균
 *  - max: 최댓값
 */
export function runBench(label: string, fn: () => void, iters: number): BenchResult {
  const raw: number[] = [];

  for (let i = 0; i < iters; i++) {
    const start = performance.now();
    fn();
    const elapsed = performance.now() - start;
    raw.push(elapsed);
  }

  const sorted = [...raw].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const max = sorted[sorted.length - 1] ?? 0;
  const mean = raw.reduce((acc, v) => acc + v, 0) / raw.length;

  return {
    label,
    p50,
    p95,
    mean,
    max,
    samples: raw,
    env: collectEnv(),
  };
}

/** 정렬된 배열에서 p번째 백분위수 값을 반환한다. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;

  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  const clamped = Math.max(0, Math.min(idx, sorted.length - 1));
  return sorted[clamped] ?? 0;
}

/** ms 숫자를 소수점 2자리 문자열로 포맷 */
function fmtMs(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}

/**
 * BenchResult 배열을 마크다운 표 문자열로 직렬화한다.
 * 결과 뒤에 환경 메타 섹션을 추가한다 (docs/benchmarks/ 기록 형식).
 */
export function serializeBench(results: readonly BenchResult[]): string {
  const header = '| label | p50 | p95 | mean | max | iters |';
  const sep = '|-------|-----|-----|------|-----|-------|';

  const rows = results.map((r) =>
    `| ${r.label} | ${fmtMs(r.p50)} | ${fmtMs(r.p95)} | ${fmtMs(r.mean)} | ${fmtMs(r.max)} | ${r.samples.length} |`,
  );

  // 환경 메타 — 첫 번째 결과의 env 사용 (동일 프로세스 내이므로 동일)
  const env = results[0]?.env;
  const envSection = env
    ? [
        '',
        '**환경**',
        '',
        `- node: ${env.node}`,
        `- electron: ${env.electron ?? 'n/a'}`,
        `- platform: ${env.platform}`,
      ].join('\n')
    : '';

  return [header, sep, ...rows, envSection].join('\n');
}
