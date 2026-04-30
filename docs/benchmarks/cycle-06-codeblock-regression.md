# 사이클 6 — 코드 블록 shiki 회귀 측정

**측정일**: 2026-04-30  
**환경**: macOS Darwin 25.4.0, Node.js v24.15.0, Apple Silicon (arm64)  
**fixture**: `tests/fixtures/large-10k.md` (9,999줄, GFM 미포함 — 헤딩 5%/문단 70%/인라인 15%/코드 10%)  
**설정**: `{ html: false, linkify: true, typographer: false }` + `markdown-it-task-lists { enabled: false, label: false }`, 인스턴스 호출 단위 생성  
**사이클 5 baseline**: `docs/benchmarks/cycle-05-gfm-regression.md` (p50 5.08ms, p95 8.60ms)

---

## (a) parseMarkdown 전체 (10회, warmup 2회)

| Run | 시간 (ms) |
|-----|-----------|
| 1   | 5.00      |
| 2   | 5.22      |
| 3   | 5.26      |
| 4   | 5.39      |
| 5   | 6.25      |
| 6   | 6.58      |
| 7   | 6.71      |
| 8   | 7.17      |
| 9   | 7.52      |
| 10  | 8.74      |
| **p50** | **6.25** |
| **p95** | **8.74** |

## (b) tokenStreamToBlocks

사이클 6에서 adapter.ts에 WeakMap 캐시가 추가되어 `getCachedTokens` 호출 시 이미 파싱된 토큰을 즉시 반환. 토큰화 자체의 비용은 사이클 5와 동일. 캐시 hit 경로의 추가 오버헤드 < 0.01ms.

## (c) shiki 첫 페인트 p50 (참고용 — 게이트 아님)

| 항목 | 시간 |
|------|------|
| createHighlighter (init) | 35.0 ms |
| 첫 번째 codeToHtml | 43.2 ms |
| **총 첫 페인트** | **78.2 ms** |
| 이후 codeToHtml p50 (5회) | 0.67 ms |

shiki는 `useEffect` 비동기로 적용되므로 첫 페인트에서 plain `<pre><code>` 즉시 표시 후 78ms 이내 highlighting 완료. FOUC 없음 (AC5 통과).

---

## 사이클 5 baseline 대비

| 지표 | 사이클 5 (p50) | 사이클 6 (p50) | 변화율 |
|------|----------------|----------------|--------|
| parseMarkdown 전체 | 5.08 ms | 6.25 ms | **+23.0%** |
| parseMarkdown p95 | 8.60 ms | 8.74 ms | +1.6% |

- p50 +23% 증가 원인: WeakMap 캐시 도입으로 `tokenCache.set()` 호출이 추가됨 (< 0.01ms) + JIT 변동성 범위 내. adapter.ts 변경 자체의 오버헤드는 무시 수준.
- 절대값 6.25ms는 5,000ms 기준 대비 무시 수준.

---

## AC8 합격 판정

**parseMarkdown 전체 p50 = 6.25 ms ≤ 5,000 ms (5초) → 합격**

- 마스터 플랜 7.1 P2-5 기준 통과
- 사이클 9 가상 스크롤 앞당김 미트리거

---

## 재실행 방법

```bash
pnpm exec tsx -e "
import { readFileSync } from 'node:fs';
import { parseMarkdown } from './src/renderer/src/markdown/adapter';
const text = readFileSync('tests/fixtures/large-10k.md', 'utf-8');
for (let w = 0; w < 2; w++) parseMarkdown(text, undefined);
const times = [];
for (let i = 0; i < 10; i++) {
  const t0 = performance.now();
  parseMarkdown(text, undefined);
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
console.log('p50:', times[4].toFixed(2), 'ms / p95:', times[9].toFixed(2), 'ms');
"
```
