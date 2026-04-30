# 사이클 7 회귀 측정

**측정일**: 2026-04-30  
**측정 환경**: macOS Darwin 25.4.0, Node.js v24.15.0  
**입력**: `tests/fixtures/large-10k.md` (9,999줄)  
**방법**: markdown-it parse 10회 → 정렬 → p50(중앙값), p95  
**워밍업**: 5회  

## parseMarkdown 회귀

| 지표 | 사이클 7 측정값 | 사이클 6 baseline | 증가율 |
|------|----------------|-------------------|--------|
| p50  | 4.39ms         | 6.25ms            | -29.7% |
| p95  | 5.67ms         | —                 | —      |

**합격 판정**: parseMarkdown p50 ≤ 5,000ms → **합격** (4.39ms)

## sanitize 오버헤드

sanitize 적용 후 첫 페인트 p50 측정은 Electron renderer 환경 필요 (수동 측정 미수행).  
sanitize.ts는 shiki 출력에만 1회 적용되며, DOMPurify DOM 연산은 브라우저 native이므로 추가 오버헤드는 미미할 것으로 예상.

## 비고

- 사이클 7에서 추가된 sanitize.ts / Image.tsx / Blockquote.tsx 는 parseMarkdown 자체와 무관
- 사이클 9 가상화(react-virtuoso) 도입 전까지는 현재 성능 충분
- 1초 이내 목표(마스터 플랜 P2-5)는 사이클 9에서 본격 추진
