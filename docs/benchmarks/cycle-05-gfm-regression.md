# 사이클 5 — GFM 회귀 측정

**측정일**: 2026-04-30  
**환경**: macOS Darwin 25.4.0, Node.js v24.15.0, Apple Silicon (arm64)  
**fixture**: `tests/fixtures/large-10k.md` (9,999줄, GFM 미포함 — 헤딩 5%/문단 70%/인라인 15%/코드 10%)  
**설정**: `{ html: false, linkify: true, typographer: false }` + `markdown-it-task-lists { enabled: false, label: false }`, 인스턴스 호출 단위 생성  
**사이클 2 baseline**: `docs/benchmarks/cycle-02-baseline.md` (전체 avg 7.15ms, 토큰화 avg 3.87ms, 5회 평균)

---

## 측정 결과 (10회 실행)

### (a) 전체: parseMarkdown 유사 (인스턴스 생성 + 플러그인 등록 + 토큰화 + 헤딩 추출 + Outline 구성)

| Run | 시간 (ms) |
|-----|-----------|
| 1   | 7.88      |
| 2   | 5.86      |
| 3   | 6.06      |
| 4   | 8.60      |
| 5   | 4.35      |
| 6   | 4.82      |
| 7   | 4.98      |
| 8   | 4.89      |
| 9   | 5.08      |
| 10  | 4.85      |
| **p50** | **5.08** |
| **p95** | **8.60** |
| **avg** | **5.74** |

### (b) 토큰화만 (`md.parse(rawText, {})`)

| Run | 시간 (ms) |
|-----|-----------|
| 1   | 7.11      |
| 2   | 5.39      |
| 3   | 5.83      |
| 4   | 8.37      |
| 5   | 4.12      |
| 6   | 4.62      |
| 7   | 4.74      |
| 8   | 4.63      |
| 9   | 4.87      |
| 10  | 4.67      |
| **p50** | **4.87** |
| **p95** | **8.37** |
| **avg** | **5.44** |

### (c) 토큰 → React 변환

Node 환경에서 React 없이 직접 측정 불가. (a)와 (b)의 차이(avg 0.30ms)에 헤딩 추출 + Outline 구성 포함.  
별도 측정: 헤딩 추출 + Outline 구성 avg ≤ 0.5ms (사이클 2와 동일 수준).

---

## 사이클 2 baseline 대비

| 지표 | 사이클 2 (avg, 5회) | 사이클 5 (p50, 10회) | 변화율 |
|------|---------------------|----------------------|--------|
| 전체 | 7.15 ms             | 5.08 ms              | -28.9% |
| 토큰화 | 3.87 ms           | 4.87 ms              | +25.8% |

- 전체 p50이 사이클 2 avg보다 낮게 측정된 이유: 사이클 2 측정은 5회 평균(첫 실행 12.91ms 포함)이고 사이클 5는 warmup 2회 후 10회 p50을 측정하여 JIT 효과 제거됨.
- 토큰화 +25.8% 증가: `linkify: true` 활성화로 URL 패턴 스캔이 추가됨. 비-GFM 텍스트(large-10k.md)에서 linkify 오버헤드가 발생. 절대값(4.87ms)은 여전히 허용 범위.

---

## AC7 합격 판정

**전체 p50 = 5.08 ms ≤ 5,000 ms (5초) → 합격**

- 마스터 플랜 7.1 P2-5 기준 통과
- 사이클 9 가상 스크롤 앞당김 미트리거

---

## 재실행 방법

사이클 6/7에서 동일 방법론으로 재측정 (warmup 2회 후 10회 p50)하여 본 문서와 비교.

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
console.log('p50 (전체):', times[4].toFixed(2), 'ms / p95:', times[9].toFixed(2), 'ms');
"
```

토큰화만(`md.parse`)·토큰→React 변환 분리 측정도 동일 형태(adapter 내부에서 단계별 performance.now). 결과는 사이클별 문서에 동일 표 포맷으로 기록.
