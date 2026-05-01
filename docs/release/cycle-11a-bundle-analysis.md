# 사이클 11a 번들 분석

**측정일**: 2026-05-01  
**빌드 명령**: `pnpm build` (electron-vite renderer 단계)  
**측정 위치**: `out/renderer/assets/`

---

## 현황 측정

| 파일 | 크기 |
|------|------|
| `index-*.js` (초기 번들) | 973 KB (973,154 bytes) |
| `out/renderer/assets/` 전체 | 10 MB |
| shiki 언어 파일 합산 | ~9 MB (lazy load — 초기 번들 무영향) |

**초기 번들(index chunk) 기준으로 비교** — shiki 언어 파일은 on-demand lazy load라 앱 시작 시 로드되지 않음.

---

## 베이스라인 대비 회귀 분석

| 사이클 | index chunk 크기 | 증감 |
|--------|----------------|------|
| 사이클 9 (베이스라인) | 874 KB | — |
| 사이클 10 (+i18next v26 + react-i18next v17 + iconv-lite) | 972 KB | +98 KB (+11.2%) |
| 사이클 11a (현재, 측정) | 973 KB | +99 KB vs C9 (+0.1 KB vs C10) |

**+98.3KB 회귀 원인**: i18next v26 + react-i18next v17 + iconv-lite 신규 의존성 추가 (사이클 10).  
사이클 11a 자체 코드 변경(zoom-bridge cleanup, ErrorState aria-label, shared/zoom.ts)은 번들 증감 <1KB.

---

## 분할 후보 3건 평가

| 후보 | 예상 절감 | 근거 | 권고 |
|------|---------|------|------|
| i18next chunk split (i18next + react-i18next 분리 청크) | ~35–45 KB | i18next v26 코어 ~28KB gzip, react-i18next ~12KB — 동적 import로 첫 페인트 지연 가능성 있음. 단 useSuspense:false라 blocking 없음 | **11b 즉시 적용 후보** (≥30KB 절감 예상) |
| react-i18next dynamic import (lazy 초기화) | ~15–20 KB | initI18n()이 App mount 전에 await되므로 분리 효과 제한적. bootstrap 구조 변경 필요 | 사이클 12 인계 (효과 불확실, 구조 변경 위험) |
| iconv-lite main process 전용 격리 재확인 | 0 KB | iconv-lite는 이미 main process에만 import (`file-service.ts`). renderer 번들에 미포함 확인됨. 추가 조치 불필요 | 해당 없음 (이미 격리됨) |

---

## 권고

| 후보 | 예상 절감 | 인계 대상 |
|------|---------|---------|
| i18next chunk split | ~35–45 KB (≥30KB) | **사이클 11b 즉시 적용** |
| react-i18next dynamic import | ~15–20 KB (<30KB) | 사이클 12 |
| iconv-lite 격리 | 이미 완료 | — |

**결론**: i18next chunk split 1건이 ≥30KB 절감 후보로 사이클 11b 적용 권고.  
실제 DMG 크기(≤130MB AC5 게이트)는 shiki 언어 파일이 lazy load이므로 index chunk 크기와 무관.  
현재 index chunk 973KB는 초기 렌더 성능에 영향을 줄 수 있으나 사이클 9 1만 줄 회귀 게이트(p50 ≤5초)는 통과 중.

---

## 환경 한계

- 번들 분석만 수행, 실제 분할 적용은 사이클 11b/12로 인계
- Gzip 압축 후 실크기는 out/ 디렉토리 기준 미측정 (브라우저 전송 크기와 다름)
- DMG 크기 실측은 v0.11.0 GitHub Actions 빌드 후 `docs/release/cycle-11a-build-report.md`에 기록
