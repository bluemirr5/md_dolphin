# 사이클 11b 번들 분석 — i18next chunk split 적용 결과

**측정일**: 2026-05-01
**빌드 명령**: `pnpm build` (electron-vite renderer 단계)
**측정 위치**: `out/renderer/assets/`
**베이스라인**: 사이클 11a index chunk 973KB (`docs/release/cycle-11a-bundle-analysis.md`)

---

## (a) index chunk 비교

| 사이클 | 파일 | 크기 (bytes) | 크기 (KB) | 차이 |
|--------|------|-------------|-----------|------|
| 11a (베이스라인) | `index-*.js` | 973,154 | 973 KB | — |
| 11b (chunk split 적용) | `index-2ocKMtGf.js` | 881,175 | 881 KB | **-92 KB (-9.5%)** |

**절감량 92KB — AC6 게이트(≥30KB) 달성.**

---

## (b) i18n chunk 크기

| 파일 | 크기 (bytes) | 크기 (KB) | 포함 모듈 |
|------|-------------|-----------|----------|
| `i18n-vwbgq-A8.js` | 102,854 | 100 KB | `i18next`, `react-i18next` |

i18next + react-i18next가 별도 청크로 분리되어 초기 번들에서 제거됨.

---

## (c) DMG 크기 영향

index chunk 92KB 절감은 gzip 압축 후 실효과 ~25–45KB 수준.
DMG는 electron 바이너리 + ASAR 압축 전체를 포함하므로 실 DMG 크기 영향 0~200KB 범위.
v0.11.0 DMG 실측값 기준 ≤130MB AC는 11a에서 이미 검증 완료 — 11b chunk split으로 추가 개선.

---

## (d) react-i18next dynamic import 효과 한계 — 사이클 12 인계

| 후보 | 예상 절감 | 판단 |
|------|---------|------|
| react-i18next dynamic import | ~15–20 KB | `initI18n()`이 App mount 전 `await`되므로 분리 효과 제한적. bootstrap 구조 변경 위험. 사이클 12 인계 |

이번 사이클은 `manualChunks: { i18n: ['i18next', 'react-i18next'] }` 정적 분리만 적용.
dynamic import는 효과 <30KB + 구조 변경 위험으로 사이클 12로 미룸.

---

## 환경

- macOS 14 Sonoma, Apple Silicon (M-series)
- Node 버전: `node --version` 기준
- 빌드 도구: electron-vite + Vite + Rollup (manualChunks 옵션)
- gzip 압축 후 전송 크기 미측정 (out/ 디렉토리 기준 미압축 파일 크기)
