# 사이클 9 — 성능 벤치·가상 스크롤·macOS 표준 메뉴

**상태**: Completed (2026-05-01, P9/CR9/CR9.2 16건 흡수, 부채 7건 처리)
**선행**: 사이클 8 커밋 `73c6c47` 그린 (255 tests, 회귀 p50 4.39ms)
**TDD 정책**: R1~R2 TDD 의무 (`benchmark.ts` 측정 시리얼라이저 + `VirtualizedArticle` 어댑터의 props→virtuoso 매핑). macOS 표준 메뉴 등록·줌 IPC·shiki lazy `loadLanguage`·인쇄/PDF·부채 7건은 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/renderer/src/perf/benchmark.ts` 신규 — `runBench(label, fn, iters): { p50, p95, mean, max, samples }` + `serializeBench(results): string` (마크다운 표). 마스터 플랜 4.7.3 표준 환경 기록(node·electron·platform). 콜드 스타트는 `app.whenReady` → `did-finish-load` 시각차 노출 IPC `bench:cold-start` (메인 측 `src/main/bench-ipc.ts` 신규, dev only — production 빌드 미노출)
- [ ] `src/renderer/src/components/VirtualizedArticle.tsx` 신규 — `react-virtuoso` `Virtuoso` 래핑. props `{ tokens: Token[]; renderToken: (t: Token, idx: number) => ReactNode; articleRef: Ref<HTMLElement> }`. `components.Scroller`로 `<article ref>` 위임 → useScrollSpy·scrollToAnchor 기존 인터페이스 보존. `rangeChanged` 이벤트로 코드블록 mount/unmount 카운트 노출 (dev 측정용)
- [ ] `src/renderer/src/components/MarkdownRenderer.tsx` 갱신 — top-level token 배열을 `VirtualizedArticle`에 위임. heading anchor id는 가상화 환경에서도 DOM에 존재해야 함 (virtuoso `overscan` 기본값으로 충분, anchor 점프 시 `VirtuosoHandle.scrollToIndex` ref 폴백 추가)
- [ ] `src/renderer/src/markdown/shiki-loader.ts` 갱신 (또는 신규) — `getHighlighter` 시 `langs: []` 빈 시작, 코드블록 lang 등장 시 `loadLanguage(lang)` 동적 호출. lang 단위 in-flight Promise 캐시(중복 import 차단). 무한 재시도 차단: lang 1개당 실패 1회 기록 후 plain text 폴백, 다음 mount에서 재시도 안 함(세션 단위 deny-list)
- [ ] `src/renderer/src/markdown/outline-extractor.ts` 갱신 — `Heading` 타입에 `tokenIndex: number` 필드 추가. `extractOutline`이 토큰 순회 중 인덱스를 함께 기록. 사이클 8 parity test가 deep-equal이므로 양쪽(렌더 측/익스트랙터 측) 동시 갱신 시 회귀 없음
- [ ] `src/main/menu.ts` 신규 — `Menu.buildFromTemplate` 6 메뉴 (App/File/Edit/View/Window/Help). File: Open(⌘O 기존)·Print(⌘P)·Save as PDF(⇧⌘P)·Close(⌘W). View: Zoom In(⌘+)·Zoom Out(⌘-)·Actual Size(⌘0)·Toggle Sidebar(⌘1)·Focus Article(⌘2). Window/Edit/Help는 표준 role. macOS 분기는 `src/shared/platform.ts` 경유 — 본 모듈은 `process.platform === 'darwin'` 직참조 1회 (App 메뉴 등록부)
- [ ] `src/main/zoom-ipc.ts` 신규 — `view:zoom-in/zoom-out/zoom-reset` IPC, `webContents.setZoomLevel(±0.5/0)` 위임. 상한 +3, 하한 -3 클램프. preload `src/preload/index.ts`에 노출 — `windowId -1` sentinel 가드 적용 (CR7-11 흡수)
- [ ] `src/main/print-ipc.ts` 신규 — `view:print` (`webContents.print({ silent: false })`)·`view:save-pdf` (`webContents.printToPDF({})` → `dialog.showSaveDialog` → `fs.writeFile`). PDF 경로 검증은 path-guard 재사용(외부 sandbox 밖 쓰기 차단)
- [ ] `src/preload/index.ts` 갱신 — 신규 IPC 4건(`bench:cold-start`/`view:zoom-in|out|reset`/`view:print`/`view:save-pdf`) 화이트리스트 등록. `bench:cold-start`는 `process.env.NODE_ENV !== 'production'` 조건부 노출
- [ ] `src/main/path-guard.ts` 갱신 — `fs.open(path, 'r' | O_NOFOLLOW)` 검증 추가 (CR7-10 흡수). 심볼릭 링크 거부 시 명시적 `EPERM` 에러 throw, asset-protocol 핸들러는 404 응답
- [ ] `src/renderer/src/markdown/sanitize.ts` 갱신 — DOMPurify 인스턴스 생성을 top-level → 첫 호출 시 lazy로 전환 (CR7-9 흡수). `typeof window === 'undefined'` 분기 + 캐시. 가상화 환경에서 동적 mount되는 코드블록도 동일 `sanitizeShikiHtml` 경로 통과 (사이클 7 AC2 회귀 가드)
- [ ] `src/renderer/src/components/Image.tsx` 갱신 — `src`/`alt` 기준 `useMemo`로 props 객체 메모화 (CR7-5 흡수, 가상화 환경 리렌더 비용 감소)
- [ ] `src/renderer/src/components/SidebarView.tsx` 갱신 — 재귀 필터에 `children.length === 0` 빈 노드 명시 처리 (CR8-6 흡수)
- [ ] `src/renderer/src/components/useScrollSpy.ts` 갱신 — deps 배열에 `articleRef.current` 명시 (CR8-7 흡수, eslint-plugin-react-hooks exhaustive-deps 준수)
- [ ] `tests/perf/benchmark.test.ts` — TDD R1: `runBench` 통계 계산 (정렬·p50/p95 인덱스), `serializeBench` 마크다운 표 형식 일치, 환경 메타 필드 존재
- [ ] `tests/components/virtualized-article.test.tsx` — TDD R2: tokens 배열 → virtuoso `data` prop 매핑, `components.Scroller`로 articleRef 전달, anchor 점프 시 `scrollToIndex` 폴백 호출 (mock), `rangeChanged` 카운트 노출
- [ ] `tests/main/menu.test.ts` — 사후: 템플릿 구조 (6 메뉴, role 매핑), 단축키 accelerator 문자열 검증
- [ ] `tests/main/zoom-ipc.test.ts` — 사후: 상한/하한 클램프, windowId -1 가드 시 IPC noop + warn
- [ ] `tests/main/path-guard.test.ts` — 사후 갱신: O_NOFOLLOW 심볼릭 링크 거부 케이스 추가
- [ ] `tests/preload/ipc-whitelist.test.ts` — 사후: 신규 IPC 4건 화이트리스트 등록 확인, `bench:cold-start`는 production 빌드(NODE_ENV mock)에서 미노출
- [ ] `tests/components/sidebar-reload.test.tsx` — 사후: localStorage persist → reload 시 `visible` 복원 단위 테스트 (CR8-8 흡수)
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 10 시작 전)**

- [ ] `docs/benchmarks/cycle-09-perf.md` — 마스터 플랜 4.7.3 표준 4지표 동시 측정 결과: 렌더 p50/p95, 콜드 스타트 p50/p95, 메모리 RSS p50, shiki 빌드 청크 크기. 가상화 코드블록 mount/unmount 카운트(P9-2)도 표 부록으로 기록. 4지표 중 1건이라도 미달 시 사이클 10 앞당김 트리거 (P8-8 형식)

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | `perf/benchmark.ts` | `runBench` 통계(p50/p95/mean/max) + `serializeBench` 마크다운 표 + 환경 메타 |
| R2 | `VirtualizedArticle.tsx` 어댑터 | tokens→virtuoso `data` 매핑, `components.Scroller`로 articleRef 위임, `scrollToIndex` 폴백, `rangeChanged` 카운트 |
| 사후 | menu·zoom-ipc·print-ipc·preload·path-guard·sanitize·Image·SidebarView·useScrollSpy·sidebar-reload·outline-extractor | AC4~AC12 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `runBench(label, fn, 100)` 결과 `p50 ≤ p95 ≤ max` 단조성, `samples.length === 100`, 환경 메타에 `electron`/`node`/`platform` 포함 | pnpm test |
| AC2 | `VirtualizedArticle`이 tokens 배열을 virtuoso `data`로 전달, `articleRef`가 `<article>` 엘리먼트에 바인딩, anchor 점프 시 미마운트 노드는 `VirtuosoHandle.scrollToIndex(idx)` 폴백 호출 | pnpm test RTL |
| AC3a | **렌더 성능**: `tests/fixtures/large-10k.md` `parseMarkdown` p50 ≤ 1000ms, p95 ≤ 1500ms (마스터 플랜 4.7.3 / 7.1 P2-5) | 수동 1회 + 벤치 문서 |
| AC3b | **콜드 스타트**: `bench:cold-start` IPC 5회 측정 p50 ≤ 1500ms, p95 ≤ 2000ms | 수동 1회 + 벤치 문서 |
| AC3c | **메모리**: 1만 줄 fixture 로드 후 RSS p50 ≤ 500MB | 수동 1회 + 벤치 문서 |
| AC3d | **빌드 청크**: shiki 관련 청크 ≤ 700KB (`pnpm build` chunk 리포트) | 수동 1회 + chunk 리포트 |
| AC4 | macOS 메뉴 6개(App/File/Edit/View/Window/Help) 등록, ⌘O/⌘P/⇧⌘P/⌘W/⌘+/⌘-/⌘0/⌘1/⌘2 단축키 동작, ⌘1/⌘2가 사이클 8 핸들러와 충돌 없음 (P8-7) | pnpm test + 수동 1회 |
| AC5 | ⌘+/⌘- 5회 누적 시 zoomLevel 클램프(+3/-3 초과 차단), ⌘0 → 0 복귀. windowId -1 sentinel 시 IPC noop + console.warn 1회 (CR7-11) | pnpm test + 수동 1회 |
| AC6 | ⌘P → 시스템 프린트 다이얼로그 표시. ⇧⌘P → 저장 다이얼로그 → 선택 경로에 PDF 파일 생성. path-guard 외부 경로 거부 | 수동 1회 |
| AC7 | 첫 코드블록 mount 시 `loadLanguage` 1회, 동일 lang 재mount 시 0회. 미지원 lang 1회 실패 후 세션 동안 재시도 0회. 가상화 `rangeChanged`로 측정한 코드블록 mount/unmount 카운트가 벤치 문서에 기록 (P9-2) | 수동 1회 + 벤치 문서 |
| AC8 | path-guard에서 심볼릭 링크 → `EPERM` throw, asset-protocol 404 응답 (CR7-10). 일반 파일은 기존 동작 유지 | pnpm test |
| AC9 | sanitize 모듈을 SSR 환경(`typeof window === 'undefined'`) mock에서 import 해도 throw 없음, 첫 호출 시 lazy 인스턴스화. 가상화 동적 mount 코드블록도 `sanitizeShikiHtml` 경로 통과 (사이클 7 AC2 회귀) | pnpm test |
| AC10 | SidebarView 재귀 필터에서 `children.length === 0` 빈 노드 명시 처리(렌더 0개), useScrollSpy deps 배열에 `articleRef.current` 포함 (CR8-6/7) | pnpm test RTL + lint |
| AC11 | localStorage `mddolphin.sidebar.visible=false` 사전 설정 → 앱 마운트 시 사이드바 미표시 단위 테스트 통과 (CR8-8) | pnpm test RTL |
| AC12 | 신규 IPC 4건(`bench:cold-start`/`view:zoom-*`/`view:print`/`view:save-pdf`) preload 화이트리스트 등록 확인, `bench:cold-start`는 `NODE_ENV=production` 빌드에서 미노출 (P9-4) | pnpm test |

---

## 설계 제약

- **벤치 측정 환경 (4.7.3)**: macOS 14+, Apple Silicon, Electron 31+, 외부 디스플레이 미연결, 백그라운드 프로세스 정리 후 5회 반복 후 중앙값. 환경 메타는 자동 수집(process.versions). 결과는 `docs/benchmarks/cycle-09-perf.md`에 표 1개로 기록 — 사이클 6/8 형식 통일. 4지표(렌더·콜드·메모리·청크) 동시 측정
- **virtuoso 통합 범위**: 본 사이클은 top-level token 배열만 가상화. 코드블록 내부·표 내부 가상화는 미도입(라인 길이 가변·shiki 토큰 일관성 위해). `overscan` 기본값(0~5 viewport) 사용, 커스텀 튜닝은 사이클 10 a11y와 합류
- **anchor 점프 + 가상화 호환**: heading 토큰이 미마운트 상태일 때 `querySelector` 실패 → `VirtuosoHandle.scrollToIndex(headingIdx)` ref 패턴 폴백 후 RAF 다음 프레임에서 재시도. 현재 `Heading` 타입에 `tokenIndex` 필드 없음 → outline-extractor에 신규 추가. 사이클 8 AC1 parity test가 deep-equal이므로 양쪽 동시 갱신 시 회귀 없음 (P9-5)
- **shiki lazy 정책**: `getHighlighter` 시 `langs: []`로 시작, mount 시 lang별 `loadLanguage` 동적 import. in-flight Promise 캐시(`Map<lang, Promise>`). 실패 lang은 세션 deny-list에 등록 → 무한 재시도 차단 (마스터 플랜 6.0 사이클 9 "shiki 캐시 가상화 mount/unmount 측정, 무한 재시도 차단")
- **가상화 sanitize 정합 (P9-3)**: VirtualizedArticle 내부 동적 mount 코드블록도 `MarkdownRenderer` 외부와 동일한 `sanitizeShikiHtml` 경로 통과. 사이클 7 AC2(DOMPurify 통과)의 회귀 가드로 RTL에서 mount-after-scroll 케이스 추가 검증
- **shiki dual theme JSON**: 사이클 6 부채 `light-soft/dark-soft` 커스텀 JSON 도입은 본 사이클에서 **검토만** 진행. 코드 변경 없음 — 결과를 벤치 문서에 1줄 메모로 기록 (도입 시 사이클 10)
- **macOS 메뉴 macOS 단일 분기**: `src/main/menu.ts`에서 `process.platform === 'darwin'` 직참조 1회 허용 (App 메뉴 등록부 — Electron 표준). 그 외 분기는 `src/shared/platform.ts` 경유. Window 메뉴 표준 role(`minimize`/`zoom`/`close`)로 OS 일관성
- **인쇄/PDF 보안**: `webContents.print({ silent: false })` — 사용자 확인 다이얼로그 필수. PDF 저장 경로는 path-guard 통과 필수 (외부 sandbox 쓰기 차단). PDF 옵션은 기본값 (페이지 크기 A4, 여백 default) — 커스텀 옵션은 사이클 10
- **줌 IPC 클램프**: `setZoomLevel` ±3 (Electron 권고 범위, 약 50%~300%). 사용자 설정 persist는 사이클 10
- **부채 7건 흡수 원칙**: CR7-5/9/10/11 + CR8-6/7/8 모두 본 사이클에서 1줄짜리 수정으로 처리. 별도 리팩토링 사이클 분리 안 함 — 가상화 환경에서 같이 회귀 검증. path-guard의 `O_NOFOLLOW`는 realpath 검증 후 open 단계 TOCTOU 방어용 추가 검사 — 두 검증 모두 통과해야 정상 응답 (P9-6)
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — shiki lang 실패 plain text 폴백, PDF 저장 실패 dialog 알림. 접근성 — 메뉴 표준 role로 VoiceOver 자동 지원, 가상화 항목에 `role="article"` 유지, ⌘+/⌘-/⌘0 표준 단축키. i18n — 메뉴 라벨 한국어(`File`→`파일` 등), 사이클 10 i18next 키 등록. 보안 — IPC 표면 신규 4건 preload 화이트리스트 등록·`bench:cold-start` dev only·windowId -1 가드, path-guard O_NOFOLLOW 강화. macOS 분기 — menu.ts 1회 직참조 허용, 그 외 platform.ts 경유. 성능 — 렌더 p50/p95·콜드 p50/p95·메모리 500MB·청크 700KB 4지표 동시 측정. 로컬 자산 — path-guard 갱신으로 자동 강화

---

## 신규 의존성

```json
{ "dependencies": { "react-virtuoso": "^4.x" }, "devDependencies": {} }
```

---

## 미룬 것

- 사이클 10: 메뉴 라벨 i18next 키 등록, 줌 레벨 persist, 사이드바 모바일 드로어, PDF 페이지/여백 커스텀 옵션, 가상화 `overscan` 튜닝, 빈 outline a11y 메시지(P8-4), TOC 클릭 직후 scroll-spy 일시 정지(P8-5), shiki dual theme 커스텀 JSON 도입(검토 결과 기반)
- Phase 2: 코드블록 내부 가상화, 표 가상화, 줌 사용자 설정 동기화(멀티 윈도우)
- 기타: 인쇄 미리보기 사용자 정의 헤더/푸터, PDF 메타데이터(제목·작성자) 자동 채움
