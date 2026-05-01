# 사이클 8 — outline-extractor 성능 측정

**측정일**: 2026-05-01  
**환경**: macOS Darwin 25.4.0, Node.js 20.x (tsx), `tests/fixtures/large-10k.md`  
**runs**: 100회, p50(중앙값)

## 결과

| 측정 항목 | p50 |
|-----------|-----|
| `parseMarkdown` 전체 (파싱 + outline 추출) | 4.39ms |
| `extractOutline` 단독 (토큰 재사용) | 0.26ms |

## 사이클 7 baseline 대비

| | 사이클 7 | 사이클 8 | 증가율 |
|-|---------|---------|-------|
| `parseMarkdown` p50 | 4.39ms | 4.39ms | -0.1% (≈ 0%) |

## 합격 여부

- `parseMarkdown` p50 ≤ 5000ms: **PASS**
- 사이클 7 baseline 대비 증가율: **0% (무회귀)**

## 비고

- `extractOutline` 단독 p50 0.26ms — 토큰 재사용 시 outline 추출 비용은 파싱의 약 6%
- 사이클 9 가상 스크롤 도입 전까지 별도 앞당김 트리거 불필요 (P8-8 기준 초과 없음)
