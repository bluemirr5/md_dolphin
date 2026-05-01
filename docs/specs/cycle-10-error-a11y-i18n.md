# 사이클 10 — 에러 UX · 접근성(웹 a11y) · i18n

**상태**: Completed (2026-05-01, P10 9건 흡수 + CR10 4건 즉시 수정, 사이클 11a 부채 9건 인계)
**선행**: 사이클 9 커밋 `4cecd30` 그린 (332 tests, 회귀 p50 4.39ms, 부채 7건 흡수)
**TDD 정책**: R1~R2 TDD 의무 (FileService 에러 분류·인코딩 감지 / i18next 초기화·locale 라우팅). ARIA 라벨링·axe-core 통합·`prefers-reduced-motion`·인계 부채(AC3d/CR9-S1/CR9-S2/AC3b·c) 및 사이클 9 인계(P8-4 빈 outline a11y, P8-5 scroll-spy 일시 정지, refs 경고)는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/main/file-service.ts` 갱신 — `readMarkdown(path)` 결과를 `Result<{ text: string; encoding: 'utf-8' | 'euc-kr' | string; bytes: number }, FileError>`로 변경. `FileError = { kind: 'permission' | 'encoding' | 'not-markdown' | 'too-large' | 'empty' | 'io'; cause?: string; pathHint?: string }`. UTF-8 디코딩 실패 시 `iconv-lite`로 EUC-KR/CP949 후보 재시도 → 성공 시 `encoding` 채움, 모두 실패 시 `kind: 'not-markdown'`. 10MB 초과는 `kind: 'too-large'` (선읽기 `fs.stat` 단계). 빈 파일(0B)은 `kind: 'empty'`. EACCES/EPERM은 `kind: 'permission'`. iconv 입력 길이 상한 32MB(BOMB 방어)
- [ ] `src/main/file-service.ts` IPC `file:open` 응답 형식 갱신 — `{ ok: true, doc } | { ok: false, error: FileError }`. 사이클 3 단일 string 반환에서 discriminated union으로 (renderer 측 ErrorState 분기 가능)
- [ ] `src/renderer/src/components/ErrorState.tsx` 신규 — `<ErrorState kind error onRetry? onCancel? />`. kind별 메시지·아이콘 분기. i18n 키 (`errors.permission`/`errors.encoding`/`errors.notMarkdown`/`errors.tooLarge`/`errors.empty`)로 t() 호출. `role="alert"` + `aria-live="polite"`
- [ ] `src/renderer/src/components/LargeFileWarning.tsx` 신규 — 10MB 이상 감지 시 모달 다이얼로그 (`role="dialog"` + `aria-labelledby`). "계속" / "취소" 버튼. 취소 시 IPC `file:cancel` 또는 단순 close (실제 파일 read는 main 쪽에서 stat 후 user confirm 받기 전에는 미실행 → 1차 stat → renderer confirm → 2차 read)
- [ ] `src/renderer/src/i18n/index.ts` 신규 — `i18next.init({ resources, lng, fallbackLng: 'en', interpolation: { escapeValue: false }, react: { useSuspense: false } })`. `resources`는 `import` 정적 로드(`./locales/ko.json`, `./locales/en.json`) — eval 회피 (보안). lng는 preload가 노출하는 `window.api.getLocale()` 결과를 `app.getLocale()`로 채워 ko/en으로 정규화 (그 외는 en fallback)
- [ ] `src/shared/locales/ko.json` 신규 + `en.json` 신규 — 키 그룹: `menu.*` (App/File/Edit/View/Window/Help — 사이클 9 하드코딩 치환), `errors.*`, `dialog.*` (열기/PDF 저장/큰 파일 경고), `a11y.*` (sidebar/article/outline 빈 메시지). 평문은 한국어 자연스러운 표현, 영어는 짧고 명료. main/renderer 양쪽이 동일 JSON 참조 (renderer는 i18next resources, main은 lookup helper)
- [ ] `src/shared/i18n-lookup.ts` 신규 — main 프로세스 전용 dot-path lookup helper(`lookup(locale, key) → string`). `src/shared/locales/{ko,en}.json`을 정적 require 후 `key.split('.').reduce(...)` 한 줄 — 5~10키(메뉴 라벨)만 사용하므로 i18next 풀 인스턴스 불요. 미존재 키는 en fallback → key 원문 반환
- [ ] `src/renderer/src/main.tsx` 갱신 — `<I18nextProvider i18n={i18n}>` 루트 래핑, App mount 전 `i18n.init` await
- [ ] `src/main/menu.ts` 갱신 — 라벨 하드코딩 → `i18nLookup(locale, 'menu.file.open')` 호출로 치환. main 측 i18next 인스턴스 미생성(P10-1: 5~10키에 풀 인스턴스 과잉). `app.getLocale()` 결과를 ko/en으로 정규화 후 lookup helper에 전달. macOS 분기는 `src/shared/platform.ts` 경유 유지 (App 메뉴 등록부 1회 직참조 외 추가 분기 없음)
- [ ] `src/main/file-ipc.ts` 신규 또는 `file-service.ts` 분리 — `file:stat` IPC (10MB 사전 확인용), `file:open` 결과 유니온 직렬화 검증
- [ ] `src/preload/index.ts` 갱신 — `getLocale(): Promise<string>` 노출(`app.getLocale` 위임), `file:stat` 화이트리스트 추가
- [ ] `src/renderer/src/styles/global.css` 갱신 — `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }`. 코드블록 복사 토스트(사이클 6) 페이드도 영향
- [ ] `src/renderer/src/styles/typography.css` 갱신 — 본문 base 폰트를 `rem` 기반 + 동적 스케일 변수 `--font-scale` (사이클 9 줌 레벨과 합류). `html { font-size: calc(16px * var(--font-scale, 1)); }`. 줌 IPC 콜백에서 `--font-scale` 갱신 (renderer 측 `zoom-bridge.ts` 신규)
- [ ] `src/renderer/src/zoom-bridge.ts` 신규 — 줌 IPC 수신 → `--font-scale` CSS 변수 갱신 단일 진입점. 사이클 9 `webContents.setZoomFactor` 호출은 본 사이클에서 1.0 고정으로 회귀(`zoomLevel * 0.1`과 비례 누적되어 1.21배가 되던 회귀 차단), CSS 변수 `--font-scale`이 단일 진입점
- [ ] `src/renderer/src/components/SidebarView.tsx` 갱신 — `aria-label={t('a11y.sidebar.outline')}`, 빈 outline 시 `<p role="status">{t('a11y.outline.empty')}</p>` 렌더 (P8-4 처리)
- [ ] `src/renderer/src/components/useScrollSpy.ts` 갱신 — TOC 클릭 직후 200ms scroll-spy 일시 정지 플래그 (P8-5). 정지 중에는 `setActiveId` 무시. CR9-S2 ref callback 패턴 동시 적용 (`useCallback` ref + cleanup)
- [ ] `src/renderer/src/components/VirtualizedArticle.tsx` 갱신 — virtuoso 자식 컴포넌트에 ref 전달 시 `forwardRef` 누락 케이스 수정 (사이클 9 콘솔 "Function components cannot be given refs" 경고 제거)
- [ ] `src/renderer/src/a11y/axe.ts` 신규 (dev only) — `import('@axe-core/react')` 동적 import, `process.env.NODE_ENV !== 'production'` 가드, App mount 후 `axe(React, ReactDOM, 1000)` 호출. production 빌드 tree-shake 검증
- [ ] `src/main/bench-ipc.ts` 갱신 — `bench:cold-start` production 미노출 단위 테스트가 mock NODE_ENV로 검증되도록 강화 (CR9-S1)
- [ ] `scripts/verify-prod-bundle.mjs` 신규 — production 번들 grep 가드 단일 스크립트 + grep 대상 배열로 axe-core·bench:cold-start·bench:render 일괄 가드(`dist/` 내 문자열 0건이어야 exit 0)
- [ ] `tests/main/file-service-errors.test.ts` — TDD R1: 5종 FileError 분기. UTF-8 깨진 바이트 → EUC-KR 재시도 성공 케이스, 모두 실패 케이스, 10MB 초과(stat mock), 0B 빈 파일, EACCES mock
- [ ] `tests/renderer/i18n.test.ts` — TDD R2: `i18n.init` 후 `t('menu.file.open')`이 ko/en 각각 정상 반환, 미존재 키 fallback en, locale `pt-BR` → en fallback, locale `ko-KR` → ko 매핑
- [ ] `tests/components/error-state.test.tsx` — 사후: kind별 메시지 렌더, `role="alert"`, retry/cancel 콜백
- [ ] `tests/components/large-file-warning.test.tsx` — 사후: 모달 표시, 취소 시 onCancel 호출, `role="dialog"` + `aria-labelledby`
- [ ] `tests/main/menu-i18n.test.ts` — 사후: ko locale에서 메뉴 라벨이 `파일`/`편집`/...로 렌더, en에서 `File`/`Edit`/... 렌더 (lookup helper 직호출 단위 테스트)
- [ ] `tests/components/sidebar-empty-a11y.test.tsx` — 사후: 빈 outline 시 `role="status"` 메시지 노출 (P8-4)
- [ ] `tests/components/use-scroll-spy-suspend.test.ts` — 사후: TOC 클릭 후 200ms 동안 setActiveId 무시 + target anchor IO hit 시 조기 해제 (P8-5)
- [ ] `tests/main/bench-ipc-prod-guard.test.ts` — 사후: NODE_ENV=production mock 시 IPC 미등록 (CR9-S1)
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 11a 시작 전)**

- [ ] `docs/benchmarks/cycle-10-perf.md` — 1만 줄 fixture 회귀 ≤ 5초 게이트 재측정(i18next + iconv 추가 후), 콜드 스타트 p50/p95(AC3b), 메모리 RSS p50(AC3c) 수동 측정 결과. AC3d emacs-lisp 청크(804KB) lazy 로드 검증 — 초기 번들 미포함 확인
- [ ] renderer initial bundle 크기 사이클 9 대비 +50KB 이내 (i18next + react-i18next 추가 후, `dist/renderer/assets/` 합산 1회 수동 측정)
- [ ] axe-core dev 런 결과 캡처 1회 — Critical/Serious 위반 0건 (Moderate은 백로그 허용)

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | `file-service.ts` 에러 분기 | 5종 `FileError` 판별 + iconv-lite EUC-KR 성공 / CP949 성공 / 모두 실패 + 10MB stat 가드 + 0B empty + EACCES |
| R2 | `i18n/index.ts` 초기화·라우팅 | 정적 resources 로드, locale `ko-KR`→ko / `pt-BR`→en fallback, 미존재 키 en fallback |
| 사후 | ErrorState·LargeFileWarning·menu i18n·prefers-reduced-motion·동적 폰트·axe·sidebar a11y·scroll-spy 정지·refs 경고·CR9-S1/S2·AC3b·c·AC3d | AC3~AC11 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `readMarkdown` UTF-8 깨진 EUC-KR 파일 → `encoding: 'euc-kr'` + 정상 text. 완전 손상 → `kind: 'not-markdown'`. 10MB+ → `kind: 'too-large'` (read 미실행). 0B → `kind: 'empty'`. EACCES → `kind: 'permission'` | pnpm test |
| AC2 | i18next ko locale에서 `t('menu.file.open')` = `파일 열기...`, en에서 `Open...`. `pt-BR` lng → en fallback. 미존재 키 `t('foo.bar')`는 키 문자열 그대로 (또는 fallback 키) | pnpm test |
| AC3 | `ErrorState` 5종 kind 모두 i18n 키로 메시지 렌더, `role="alert"`, retry/cancel 콜백 호출 | pnpm test RTL |
| AC4 | 10MB 초과 파일 열기 시도 → main `file:stat` 응답 → renderer가 `LargeFileWarning` 모달 노출, "계속" 시 `file:open` 진행, "취소" 시 read 미실행 | pnpm test RTL + 수동 1회 |
| AC5 | macOS 메뉴 6개 라벨이 시스템 locale 기반 ko/en으로 렌더 (`app.getLocale()` mock). ⌘O/⌘P/⇧⌘P/⌘W/⌘+/⌘-/⌘0/⌘1/⌘2 단축키 동작 유지 (사이클 9 AC4 회귀) | pnpm test + 수동 1회 |
| AC6 | `prefers-reduced-motion: reduce` 환경에서 부드러운 스크롤/애니메이션 비활성. CSS 미디어 쿼리 jsdom mock으로 검증 | pnpm test |
| AC7 | 줌 IPC 호출 시 `--font-scale` CSS 변수 갱신, 본문 폰트가 `rem` 기반으로 비례 확대. ⌘0 시 1.0 복귀. `setZoomFactor`는 1.0 고정 (회귀 가드) | pnpm test RTL + 수동 1회 |
| AC8 | dev 환경 axe-core 런에서 Critical/Serious 위반 0건 (1회 수동 캡처). production 빌드에서 axe 코드 미포함 (`scripts/verify-prod-bundle.mjs` exit 0) | 수동 1회 + pnpm test |
| AC9 | 빈 outline 시 사이드바에 `role="status"`로 i18n 메시지 노출(P8-4). TOC 클릭 직후 200ms 동안 scroll-spy 일시 정지로 active 깜빡임 없음(P8-5) | pnpm test RTL |
| AC10 | 가상화 컴포넌트 mount 시 콘솔에 "Function components cannot be given refs" 경고 0건 (jsdom console.error spy) | pnpm test RTL |
| AC11 | 1만 줄 fixture 회귀 p50 ≤ 5000ms 유지 (i18next + iconv 추가에도 게이트 통과). `docs/benchmarks/cycle-10-perf.md`에 표 1개로 기록 | 수동 1회 + 벤치 문서 |

---

## 설계 제약

- **인코딩 감지 정책**: UTF-8 우선 시도 → 실패 시 `iconv-lite`로 EUC-KR/CP949 순서 재시도. UTF-16 BOM은 별도 분기 안 함(macOS 마크다운 작성 환경 희박). 입력 길이 상한 32MB로 디코딩 폭탄 방어 — 이후는 `too-large`로 차단. iconv-lite import 위치는 `src/main/file-service.ts` 단일 — renderer/preload import 금지(ESLint no-restricted-imports 룰 사후 추가)
- **에러 분류 단일 진실원**: `FileError.kind` 5종은 `src/main/file-service.ts`에서만 정의. renderer는 import한 type alias만 사용 — 분기 누락 시 typecheck 실패 보장 (discriminated union exhaustiveness)
- **i18next 보안**: `resources`는 정적 import만 — 동적 fetch/eval 금지(CSP `default-src 'none'`과 정합). `interpolation.escapeValue: false`는 React가 이미 escape하므로 안전
- **i18n 인스턴스 이중화**: renderer는 i18next 풀 인스턴스, main은 `src/shared/locales/*.json`을 read하는 자체 lookup helper(`src/shared/i18n-lookup.ts` 신규, 5~10키 한정 dot-path) 사용. 결정 12 번들 크기 솔직 표기 정합
- **동적 폰트 스케일**: `html { font-size: calc(16px * var(--font-scale, 1)); }` 단일 진입점. 본문은 모두 `rem` 기반. 줌 IPC(사이클 9 ±3 클램프)와 1:1 매핑 — `--font-scale = 1 + zoomLevel * 0.1` 계산. 단일 진입점: `--font-scale` CSS 변수만 사용. `setZoomFactor` 비례 누적(1.21배) 회피. 줌 레벨 persist는 사이클 11a 이후
- **axe-core dev only**: `import('@axe-core/react')` 동적 import + NODE_ENV 가드. production 번들 tree-shake 검증을 `scripts/verify-prod-bundle.mjs`로 자동화 — `dist/` 내 `axe-core` 문자열 grep 0건이어야 통과 (CR9-S1과 동일 패턴)
- **scroll-spy 일시 정지 (P8-5)**: TOC 클릭 핸들러가 200ms `suspendUntil` 타임스탬프 설정 → `useScrollSpy`가 매 IntersectionObserver 콜백에서 `Date.now() < suspendUntil`이면 `setActiveId` 호출 스킵. 200ms는 macOS scroll-behavior smooth 기본값 근사 + 또는 target anchor IO hit 발생 시 조기 해제 (양방향 가드)
- **refs 경고 처리**: `VirtualizedArticle` 내부 자식 중 `forwardRef` 누락 컴포넌트(추정: `Image`/`CodeBlockView`)를 식별 후 추가. JSDOM 콘솔 spy로 회귀 가드
- **부채 흡수 원칙 (사이클 9 인계 4건 + 8 인계 2건)**: AC3d emacs-lisp 청크는 lazy 로드 확인만(추가 분할 없음 — 단일 lang 파일이라 효과 미미), CR9-S1은 prod-bundle verify 스크립트로 자동화, CR9-S2는 useScrollSpy 리팩터에 합류, AC3b/c는 벤치 문서 1회 수동 측정. P8-4/P8-5는 본 사이클 a11y 본진과 합류
- **macOS 분기**: 메뉴 i18n 치환 시에도 `src/shared/platform.ts` 경유 유지. `process.platform === 'darwin'` 직참조는 `src/main/menu.ts` App 메뉴 등록부 1회 외 신규 추가 없음
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — 5종 `FileError` + i18n 메시지 + 10MB 사전 확인 모달. 접근성 — ARIA 라벨, `role="alert"`/`status`/`dialog`, `prefers-reduced-motion`, 동적 폰트(rem), axe-core dev. i18n — i18next + ko/en JSON, `app.getLocale()` 자동 추종, 정적 import. 보안 — 정적 리소스 import(eval 회피), iconv 입력 32MB 상한 + iconv-lite main 전용, file-stat IPC 화이트리스트. macOS — 메뉴 i18n도 platform.ts 경유. 성능 — 1만 줄 회귀 ≤ 5초 게이트 유지, AC3b/c 수동 측정. 로컬 자산 — 영향 없음
- **사후 라운드 이월 금지**: AC3~AC11은 본 사이클 안에 종결, 다음 사이클 인계 0 — 사이클 9 AC3b/c 이월 패턴 회피

---

## 신규 의존성

```json
{
  "dependencies": {
    "i18next": "^23.x",
    "react-i18next": "^14.x",
    "iconv-lite": "^0.6.x"
  },
  "devDependencies": {
    "@axe-core/react": "^4.x"
  }
}
```

i18next/react-i18next는 renderer 전용. main은 `src/shared/i18n-lookup.ts` 자체 helper 사용(별도 의존성 0).

---

## 미룬 것

- 사이클 11a: 사용자 강제 locale 선택 UI(시스템 자동 추종 외), 줌 레벨 persist (멀티 윈도우 동기화 포함), 사이드바 모바일 드로어, PDF 페이지/여백 커스텀 옵션, 가상화 `overscan` 튜닝, shiki dual theme 커스텀 JSON 도입(사이클 6 검토 결과 기반), **CR10 부채 9건 인계**: CR10-1(too-large 분기 순서 명시성), CR10-6(zoom-bridge initZoomBridge dispose 저장), CR10-7(ZOOM_STEP=0.5 vs 스펙 zoomLevel 예시 정합), CR10-8(i18next v26/react-i18next v17 vs 스펙 ^23/^14), CR10-9(ErrorState aria-label i18n 키), CR10-10(FileErrorKind 'encoding' dead kind 주석), CR10-11(verify-prod-bundle grep 대상 주석), CR10-12(CR10-5 협력 useScrollSpy deps), renderer initial bundle +98.3KB(+50KB 게이트 초과 — 사이클 11a 번들 분석)
- Phase 2: 추가 locale (ja/zh), 사용자 폰트 패밀리 선택, 고대비 모드(WCAG AAA), 음성 안내(VoiceOver 커스텀 라벨), `app.getLocale` 변경 hot-reload
- 기타: UTF-16 BOM 디코딩, 인코딩 사용자 강제 선택 UI, axe 위반 Moderate 자동 수정

---

## Open Questions

- Q1: **해소(P10-1)**: main은 lookup helper만 사용, JSON은 main asar에 비압축 ~4KB · renderer gzip ~1KB. shared 이동 채택, 이중화 부담 없음
- Q2: iconv-lite 후보 순서를 EUC-KR → CP949만 시도(2회). Big5/Shift-JIS 추가 여부는 사용자 피드백 후 Phase 2

---

## 변경 이력

| 일자 | 라운드 | 항목 | 반영 |
|------|--------|------|------|
| 2026-05-01 | P10-1 | main 프로세스 i18next 인스턴스 제거 | renderer만 i18next 풀 인스턴스, main은 `src/shared/i18n-lookup.ts` 자체 helper. 신규 의존성에서 main 측 i18next 제외. JSON은 `src/shared/locales/`로 이동 |
| 2026-05-01 | P10-2 | TDD R1 인코딩 3분기 | R1 핵심 칼럼 "EUC-KR 성공 / CP949 성공 / 모두 실패"로 명시 |
| 2026-05-01 | P10-3 | 사후 라운드 이월 금지 | 설계 제약 마지막 bullet 추가 — AC3~AC11 본 사이클 종결 |
| 2026-05-01 | P10-4 | 줌 메커니즘 단일 진입점 | `zoom-bridge.ts` DoD 항목에 `setZoomFactor` 1.0 고정 회귀 명시. AC7에 회귀 가드 1줄. 설계 제약 "동적 폰트 스케일"에 단일 진입점 + 1.21배 회피 |
| 2026-05-01 | P10-5 | scroll-spy 양방향 가드 | 설계 제약 "scroll-spy 일시 정지"에 target anchor IO hit 시 조기 해제 추가. R2 사후 테스트 케이스도 동시 추가 |
| 2026-05-01 | P10-6 | verify-prod-bundle 단일화 | DoD 분리 항목 신규 — grep 대상 배열로 axe-core·bench:cold-start·bench:render 일괄 가드 |
| 2026-05-01 | P10-7 | renderer initial bundle 회귀 측정 | DoD B에 +50KB 이내 게이트 1줄 추가 |
| 2026-05-01 | P10-8 | iconv-lite main 전용 격리 | 설계 제약 "인코딩 감지 정책" 끝에 import 위치 단일 명시. 의무 기재 보안 줄에 "iconv-lite main 전용" 토큰 추가 |
| 2026-05-01 | P10-9 | Open Question Q1 정확성 | P10-1 채택으로 자연 해소 — "**해소(P10-1)**" 마킹 |
| 2026-05-01 | CR10 즉시 수정 | CR10-2: OutsideBaseDirError kind 오분류 수정 | `readMarkdown` traversal 에러 `kind: 'io'` → `kind: 'permission'` 변경 |
| 2026-05-01 | CR10 즉시 수정 | CR10-3: file:stat path-guard 누락 보안 수정 | `API_FILE_STAT` 핸들러에 `assertWithinBaseDir` 검증 추가. 회귀 테스트 `tests/main/file-stat-guard.test.ts` 신규 (3케이스) |
| 2026-05-01 | CR10 즉시 수정 | CR10-4: ErrorState/LargeFileWarning production 연결 | `App.tsx` openFilePath 헬퍼 + 에러 state 추가. `DropZone.tsx` onFileDropError 콜백 추가. `env.d.ts` fileStat/getLocale/onZoomChanged 동기화 |
| 2026-05-01 | CR10 즉시 수정 | CR10-5+CR10-12: useScrollSpy Observer 재생성 수정 | suspendUntil/pendingTarget useState → useRef 교체. articleRef.current deps 제거. Observer 재생성 횟수 spy 테스트 추가 |
| 2026-05-01 | CR10 사이클11a 인계 | CR10-1·6·7·8·9·10·11 부채 8건 | CR10-1: too-large 분기 순서 명시성. CR10-6: zoom-bridge dispose 미저장. CR10-7: ZOOM_STEP=0.5 vs 예시 불일치. CR10-8: i18next v26/react-i18next v17 vs 스펙 ^23/^14. CR10-9: ErrorState aria-label 한국어 하드코딩. CR10-10: encoding dead kind 주석. CR10-11: verify-prod-bundle grep 대상 주석. |
