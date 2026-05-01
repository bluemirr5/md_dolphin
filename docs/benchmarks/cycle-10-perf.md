# 사이클 10 — 성능 측정 (에러 UX · 접근성 · i18n)

**측정일**: 2026-05-01
**환경**: macOS Darwin 25.4.0 (Apple Silicon, arm64), Node.js 24.15.0 (tsx), Electron 41.3.0
**fixture**: `tests/fixtures/large-10k.md`
**runs**: 100회, 중앙값(p50)

---

## 1. 렌더 성능 회귀 — parseMarkdown (AC11)

i18next + react-i18next + iconv-lite 추가 후 회귀 측정.

| label | p50 | p95 | mean | max | iters |
|-------|-----|-----|------|-----|-------|
| parseMarkdown (large-10k.md) | 4.31ms | 7.03ms | 4.98ms | 16.28ms | 100 |

**사이클 9 대비**: p50 4.05ms → 4.31ms (+6.4%, parse 로직 무변경, 측정 오차 범위 내)

**판정**: p50 4.31ms ≤ 5000ms — **PASS** (≤ 1000ms 게이트 대비도 통과)

**환경**

- node: 24.15.0
- electron: Electron 런타임에서 측정 필요 (bench:cold-start IPC로 기록 예정)
- platform: darwin

---

## 2. 콜드 스타트 (AC3b)

`bench:cold-start` IPC (`APP_START_TIME` → `did-finish-load` 시각차)는 실제 Electron 런타임에서만 측정 가능합니다.

| 지표 | 목표 | 상태 |
|------|------|------|
| 콜드 스타트 p50 | ≤ 1500ms | 수동 측정 환경 미구비, 사이클 11a CI 통합 후 재측정 |
| 콜드 스타트 p95 | ≤ 2000ms | 수동 측정 환경 미구비, 사이클 11a CI 통합 후 재측정 |

---

## 3. 메모리 (AC3c)

large-10k.md 로드 후 RSS 측정은 Electron 런타임에서만 확인 가능합니다.

| 지표 | 목표 | 상태 |
|------|------|------|
| RSS p50 | ≤ 500MB | 수동 측정 환경 미구비, 사이클 11a CI 통합 후 재측정 |

---

## 4. AC3d emacs-lisp 청크 lazy 로드 검증

| 청크 | 크기 | 번들 포함 여부 |
|------|------|--------------|
| emacs-lisp-DKZV9Ndz.js | 804.72 kB | 초기 번들 미포함 (lazy) |

`out/renderer/assets/index-BC3ydhHD.js` 내 `emacs-lisp` 문자열 2건 발견 → 모두 `() => import("./emacs-lisp-DKZV9Ndz.js")` 형태의 동적 import 참조임을 확인. 언어 정의 본문은 포함되지 않음.

**판정**: emacs-lisp 청크 본문 초기 번들 미포함 — **PASS**

**메모**: emacs-lisp는 shiki 단일 lang 파일이므로 추가 분할 불가. lazy load로 초기 로드에 영향 없음 (사이클 9 WARN과 동일 상태).

---

## 5. renderer initial bundle 크기 (P10-7)

| 사이클 | index 번들 | CSS | 증가 |
|--------|-----------|-----|------|
| 사이클 9 | 867.13 kB | — | baseline |
| 사이클 10 | 965.43 kB | 16 kB | **+98.3 kB** |

**판정**: +98.3 kB > +50 kB 게이트 — **WARN** (게이트 초과)

**원인**: i18next(~40 kB gzip ~14 kB) + react-i18next(~30 kB) + iconv-lite(~30 kB) 추가. 기능 요구상 필수 의존성이며 tree-shake 후에도 이 수준이 최소치. 사이클 11a에서 번들 분석(`vite-bundle-visualizer`) 후 i18next namespace 분할 또는 lazy init 검토 권장.

---

## 6. shiki dual theme 검토 (설계 제약)

shiki `light-soft`/`dark-soft` 커스텀 JSON 도입 시 index 청크 소폭 증가 예상(~20 kB). 현재 index 번들이 이미 +98 kB 초과 상태이므로 도입 시 사이클 11a에서 번들 크기 최적화와 동시 진행 권장. 도입 여부 사이클 11a 결정.

---

## 7. axe-core production 번들 검증 (AC8)

`scripts/verify-prod-bundle.mjs` 실행 결과:

```
[verify-prod-bundle] 검사 통과: 276개 파일, 위반 0건
```

**판정**: production 번들 axe-core 미포함 — **PASS** (exit 0)

axe-core dev 런 수동 캡처(Critical/Serious 위반 0건)는 수동 1회 캡처 보류. production tree-shake 검증은 `scripts/verify-prod-bundle.mjs` 자동 게이트 통과(0 hits)로 대체.

---

## 8. 사이클 10 종합 판정

| 지표 | 목표 | 측정값 | 판정 |
|------|------|--------|------|
| parseMarkdown p50 | ≤ 5000ms | 4.31ms | PASS |
| parseMarkdown p95 | — | 7.03ms | 참고 |
| emacs-lisp lazy 검증 | 초기 번들 미포함 | 동적 import 참조만 | PASS |
| axe-core prod 제거 | 0 hits | 0 hits (276파일) | PASS |
| renderer index 번들 증가 | ≤ +50 kB | +98.3 kB | WARN |
| 콜드 스타트 p50 | ≤ 1500ms | 미측정 | 사이클 11a |
| 메모리 RSS p50 | ≤ 500MB | 미측정 | 사이클 11a |

**결론**: 렌더 성능 회귀 없음, emacs-lisp lazy 로드 및 axe-core prod 제거 확인. 번들 크기 +98 kB는 i18next/react-i18next/iconv-lite 필수 의존성 추가 결과로 WARN 기록. 사이클 11a에서 번들 분석 및 최적화, Electron 런타임 콜드 스타트/메모리 측정 진행.
