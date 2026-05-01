# 사이클 8 — 목차(TOC) 사이드바

**상태**: Completed (2026-05-01)
**선행**: 사이클 7 커밋 `c0fd169` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R2 TDD 의무 (`OutlineExtractor` TS 모듈 — 추출·트리·중복 anchor·H5/H6 정책). 사이드바 컴포넌트, 스크롤 점프, 토글 상태, App 합류는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/renderer/src/markdown/outline-extractor.ts` 신규 — 사이클 2 `adapter.ts`의 `extractHeadings`/`buildOutline`/`slugify`/`resolveAnchor`/`buildLineOffsets`/`flattenInlineTokens`를 본 모듈로 이전. `extractOutline(rawText, tokens): { headings, outline }` 단일 export. adapter는 본 모듈 import (마스터 플랜 6.0 사이클 8 변경 "TS로 재작성" 충족, 보안 단일 소스 유지)
- [ ] `src/renderer/src/markdown/adapter.ts` 갱신 — heading 관련 헬퍼를 outline-extractor 호출로 교체. `parseMarkdown`의 외부 시그니처·반환 타입 무변경 (사이클 2 AC10 회귀 없음)
- [ ] `src/renderer/src/components/SidebarView.tsx` 신규 — props `{ outline: Outline; activeAnchor: string | null; onJump: (anchor: string) => void }`. `nav[aria-label="문서 목차"]` 루트, `<ul>` 재귀 렌더 (H1~H4만 표시, H5/H6는 도메인에 보존되지만 사이드바 비표시 — 시각 노이즈 차단). 항목은 `<button>`(앵커 텍스트)로 클릭 시 `onJump(anchor)`. 들여쓰기는 level별 `padding-inline-start: calc((level - 1) * 12px)` (CSS 변수 신규 추가 금지)
- [ ] `src/renderer/src/components/SidebarToggleButton.tsx` 신규 — `aria-pressed`, `aria-label="목차 표시/숨기기"`, ⌘1 단축키와 동일 동작. 사이드바 우상단 또는 본문 좌상단 sticky 배치
- [ ] `src/renderer/src/components/useScrollSpy.ts` 신규 — `IntersectionObserver`로 viewport 진입 헤딩 추적. 동시 노출 시 가장 위 헤딩의 anchor 반환. `headings` 배열·`articleRef` 인자 → `activeAnchor` state 반환 hook
- [ ] `src/renderer/src/components/scrollToAnchor.ts` 신규 — `scrollToAnchor(anchor, articleEl): void`. `articleEl.querySelector(\`[id="\${CSS.escape(anchor)}"]\`)` → `scrollIntoView({ behavior: 'smooth', block: 'start' })`. `prefers-reduced-motion: reduce` 시 `behavior: 'auto'`로 폴백. 미발견 시 noop + `console.warn`
- [ ] `src/renderer/src/store/sidebar-store.ts` 신규 — Zustand store `{ visible: boolean; toggle(): void; setVisible(v): void }`. 초기값 `true`. **모듈 최상위 싱글턴 인스턴스 + `useSidebarVisible()`/`useSidebarToggle()` 훅 export (P8-1 옵션 A)** — 마스터 플랜 4.5 `AppSettings` 분류(앱 전역 사용자 설정). P3-7 factory+Provider 패턴은 윈도우 단위 도큐먼트 상태에만 적용하므로 본 store는 모듈 최상위로 단순화. localStorage `mddolphin.sidebar.visible` persist(JSON 단순 boolean), 접근/파싱 실패 시 메모리 store 유지 + `console.warn` 1회 + 다음 토글에서 재시도(P8-6)
- [ ] `src/renderer/src/App.tsx` 갱신 — `<DropZone>` 내부 layout을 `<aside>`(SidebarView) + `<main>`(MarkdownRenderer) 2-column flex로 변경. 사이드바 visible=false 시 `<aside>` 미마운트(레이아웃 점프 회피 위해 width transition은 200ms ease, `prefers-reduced-motion` 시 0ms). ⌘1 keydown handler 추가(기존 ⌘O handler와 동일 패턴), 본문 focus 복귀는 ⌘2 (마스터 플랜 6.3 a11y 미리 합류 — 사이클 10에서 i18n·ARIA 폴리싱)
- [ ] `src/renderer/src/styles/sidebar.css` 신규 — `aside.md-sidebar` `position: sticky; top: 0; height: 100vh; overflow-y: auto; width: 240px; border-right: 1px solid var(--code-bg)`. 활성 항목 강조 `--quote-bar` 좌측 border 2px. 토글 버튼 hover/focus 스타일. 토큰 신규 추가 0건 (사이클 4 동결)
- [ ] `src/renderer/src/main.tsx` (또는 styles 배럴) — `sidebar.css` import
- [ ] `tests/markdown/outline-extractor.test.ts` — TDD R1: `# A\n## B\n## C\n# D` 트리, H1→H3 점프, 중복 anchor `-N` suffix, 한글 anchor 보존, H5/H6 도메인 보존, 빈 입력 → `{ headings: [], outline: { root: [] } }`, `**[link](url)**` 헤딩 → text 평탄화(링크 마크업 strip)
- [ ] `tests/markdown/adapter-outline-parity.test.ts` — TDD R2: 사이클 2 `parseMarkdown` 결과의 `headings`/`outline`이 outline-extractor 단독 호출 결과와 동치 (회귀 가드)
- [ ] `tests/components/sidebar-view.test.tsx` — 사후 RTL: 트리 렌더, 항목 클릭 시 `onJump(anchor)` 호출, 활성 anchor에 강조 클래스, H5/H6 비표시
- [ ] `tests/components/sidebar-toggle.test.tsx` — 사후 RTL: 토글 클릭 시 store visible 반전, ⌘1 keydown 동일 동작, localStorage persist
- [ ] `tests/components/scroll-to-anchor.test.ts` — 사후: jsdom `scrollIntoView` mock 호출 검증, `prefers-reduced-motion` matchMedia mock 시 `behavior: 'auto'`, 미발견 anchor → noop + warn
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 9 시작 전)**

- [ ] `docs/benchmarks/cycle-08-outline-extractor.md` — `tests/fixtures/large-10k.md` 기준 `extractOutline` 단독 p50, `parseMarkdown` 전체 p50, 사이클 7 baseline(4.39ms) 대비 증가율(%). **합격: parseMarkdown p50 ≤ 5초** (마스터 플랜 7.1 P2-5). 측정 환경 4.7.3 표준. **초과 시 사이클 9 가상 스크롤 앞당김 트리거 (P8-8, 사이클 6 스펙과 동일 형식)**

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | `outline-extractor.ts` 단독 모듈 | extractOutline(rawText, tokens) → headings·outline 동치, anchor slug·중복 suffix·H5/H6 도메인 보존·인라인 평탄화 |
| R2 | adapter ↔ outline-extractor parity | `parseMarkdown` 결과의 headings/outline = outline-extractor 단독 호출 결과 (회귀 가드) |
| 사후 | SidebarView·Toggle·useScrollSpy·scrollToAnchor·sidebar-store·App 합류·1만 줄 회귀 | AC4~AC10 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `extractOutline(rawText, tokens)` 반환의 `headings`·`outline` 구조가 사이클 2 `parseMarkdown(rawText, undefined)` 결과의 동일 필드와 deep-equal | pnpm test |
| AC2 | 중복 헤딩 `# Hello\n# Hello` → anchor `hello`/`hello-1`. `**[link](url)**` 헤딩 → text `link`. H5/H6 → headings 배열 보존, outline 트리에도 노드로 포함(사이클 2 `extractHeadings`/`buildOutline` 동작과 동일, level 필터 없음). SidebarView 필터에서만 비표시 — P8-2 | pnpm test |
| AC3 | adapter 외부 export = `parseMarkdown` + `getCachedTokens` 2개 유지(사이클 6 AC3 회귀 없음). `MarkdownDocument` 타입 무변경 | pnpm typecheck + grep |
| AC4 | SidebarView가 outline 트리를 `<nav><ul>` 재귀 렌더. H1~H4만 표시, H5/H6 비표시. level별 들여쓰기 적용 | pnpm test RTL |
| AC5 | 사이드바 항목 클릭 → `scrollToAnchor(anchor, articleEl)` → `articleEl.querySelector('[id=...]').scrollIntoView({ behavior: 'smooth' })` 1회 호출. `prefers-reduced-motion: reduce` 환경에서 `behavior: 'auto'` | pnpm test + 수동 1회 |
| AC6 | 스크롤 시 viewport 진입 헤딩의 anchor가 `activeAnchor`로 갱신, SidebarView에서 해당 항목에 활성 클래스(`--quote-bar` border) 적용 | 수동 1회 |
| AC7 | ⌘1 keydown → 사이드바 토글(visible 반전), ⌘2 → 본문(`<main>`) focus. localStorage `mddolphin.sidebar.visible` 변경 후 reload 시 상태 복원 | pnpm test RTL + 수동 1회 |
| AC8 | 사이드바 토글 버튼: `aria-pressed` 동기화, `aria-label="목차 표시/숨기기"`. visible=false 시 `<aside>` 미마운트, 본문 폭 확장 | pnpm test RTL |
| AC9 | 빈 문서 / 헤딩 0개 문서 → SidebarView 렌더되지만 `<ul>` 비어 있음(빈 상태 메시지 없음, 시각 노이즈 차단). 토글은 정상 동작 | pnpm test RTL |
| AC10 | `tests/fixtures/large-10k.md` 회귀: `parseMarkdown` p50 ≤ 5초. `extractOutline` 단독 p50 별도 기록(게이트 아님). 사이클 7 baseline 대비 증가율 보고 | 수동 1회 |

---

## 설계 제약

- **OutlineExtractor 분리 범위**: 사이클 2 adapter.ts에 인라인이던 `extractHeadings`/`buildOutline`/`slugify`/`resolveAnchor`/`buildLineOffsets`/`flattenInlineTokens` 6개 헬퍼를 outline-extractor.ts로 이전. `parseMarkdown`은 본 모듈 호출로 위임 — 보안 단일 소스(`html: false` 의존성은 adapter가 유지). 마스터 플랜 6.0 사이클 8 "TS로 재작성"은 모듈 추출+전용 테스트 추가로 충족(이미 TS이므로 "재작성"은 책임 분리 의미)
- **anchor 충돌 처리**: 사이클 2 `resolveAnchor` 동일 알고리즘 유지(`hello`/`hello-1`/`hello-2`). 한글 `## 헬로` → `헬로`. 한글-영문 혼합 `## Hello 세계` → `hello-세계`. 빈 anchor(헤딩 텍스트가 strip 후 빈 문자열)는 `section`/`section-1` 폴백 — 사이클 2 동작과 동일하면 그대로, 아니면 outline-extractor에서 폴백 추가
- **들여쓰기 정책**: H1=0, H2=12px, H3=24px, H4=36px (level 기반 산술). 4단계 초과는 도메인에 보존되지만 사이드바 비표시(시각 노이즈). H5/H6 비표시는 디자인 토큰 5.5 "TOC 사이드바 H1~H3" 가이드보다 H4 1단계 확장 — 일반 한국어 README가 H4까지 자주 사용. **SidebarView 필터(P8-2)**: `level <= 4` 노드만 렌더, 자식 노드는 재귀적으로 동일 필터 적용 — H4 아래 H5만 있는 섹션은 H4만 표시되고 자식 노드는 자연스럽게 비어 있는 형태
- **scroll-spy 임계 정책**: `IntersectionObserver` `rootMargin: "0px 0px -70% 0px"` (헤딩이 상단 30% 진입 시 활성). 동시 노출 헤딩 다수일 때 `entry.boundingClientRect.top` 가장 작은(상단에 가까운) 헤딩 선택. throttle 없음 — IntersectionObserver 자체가 비동기 콜백이라 RAF 동기 쿨다운 불요
- **scrollIntoView 폴리필 회피**: Chromium 내장 `behavior: 'smooth'`만 사용. 라이브러리 도입 없음. `prefers-reduced-motion` 분기는 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` 1회 평가 — 사용자 설정 변경 시 다음 점프부터 반영(이벤트 구독 불요, 사이클 10 a11y에서 정착)
- **키보드 단축**: ⌘1=사이드바 토글, ⌘2=본문 focus. macOS 단일 환경이라 `event.metaKey` 직참조 (사이클 3 ⌘O 패턴과 동일, `process.platform === 'darwin'` 분기 불요 — `src/shared/platform.ts` 사용처 0건). i18n 라벨은 사이클 10
- **sticky 위치**: `<aside>` `position: sticky; top: 0; height: 100vh; overflow-y: auto`. 본문 스크롤은 `<main>` 또는 article 자체에서 발생 — App 레이아웃이 body 스크롤을 article로 위임해야 함. 만약 body 스크롤이라면 `position: fixed; left: 0`로 폴백(구현자 재량 — 둘 중 RTL 테스트가 통과하는 쪽)
- **window 폭 대응**: 본 사이클은 폭 700px 미만 분기 미도입. 사이드바 항상 240px width. 반응형(모바일 드로어)은 사이클 10 a11y와 합류
- **store 패턴**: 사이클 3 `document-store` Zustand 패턴 그대로(P3-7 — DocumentProvider 컨텍스트 분리). sidebar-store는 단일 윈도우 전역으로 충분 — 윈도우별 격리 불요(사용자 설정 성격). localStorage 직쓰기는 `persist` middleware 또는 Zustand subscribe로 1줄 작성
- **Outline 타입 무변경**: 사이클 2 정의 `Outline`/`OutlineNode`/`Heading` 그대로 소비. 새 필드(예: `isVisible`) 도입 금지 — 가시성은 SidebarView 내부에서 level 기준 필터
- **adapter API 동결 회복**: outline-extractor 모듈 import는 adapter 내부 전용. `extractOutline` 외부 export는 허용하지만 **본 사이클의 즉시 호출자는 0개** — SidebarView는 App에서 `parseMarkdown` 결과의 `document.outline`을 prop으로 전달받음. 토큰을 이미 보유한 호출자(예: 사이클 9 가상화에서 chunk별 outline 재계산)가 재사용할 수 있도록 export만 미리 열어둠 (P8-3)
- **App 데모 갱신**: `EMPTY_HINT_TEXT`에 H2/H3 헤딩 1~2개 추가하여 사이드바 시각 검증 가능. 사이클 5/6/7 데모는 그대로
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — anchor 미발견 시 `console.warn` + noop. 접근성 — `nav[aria-label]`, 토글 `aria-pressed`/`aria-label`, ⌘1·⌘2 키보드 네비, `prefers-reduced-motion` 대응. i18n — `aria-label` 한국어 직표기(사이클 10에서 i18next 키 등록). 보안 — IPC 표면 변경 없음, sanitize 무관, CSP 무영향. macOS 분기 — 해당 없음(`event.metaKey`는 분기 불요). 성능 회귀 — `tests/fixtures/large-10k.md`로 outline-extractor + parseMarkdown 양쪽 측정. 로컬 자산 — 해당 없음

---

## 미룬 것

- 사이클 9: 가상 스크롤(react-virtuoso) 환경에서 TOC 점프 동작 재검증, scroll-spy를 virtuoso `rangeChanged` 이벤트로 전환 검토, shiki lazy `loadLanguage`, **사이클 7 인계 부채 4건(CR7-5/9/10/11)**, 1만 줄 1초 본격 측정, **⌘1/⌘2 단축키가 사이클 9 macOS 표준 메뉴 템플릿(Window 메뉴)과 충돌 없는지 검증 (P8-7)**
- 사이클 10: 키보드 단축 i18n 라벨, 사이드바 모바일 드로어(반응형), `prefers-reduced-motion` 통합 정책, ARIA 본격 폴리싱, 빈 outline 시 안내 메시지(에러 UX와 함께, **빈-목차 a11y 메시지 포함 — P8-4**), **TOC 클릭 직후 scroll-spy 일시 정지(클릭 anchor 도달까지 활성 anchor 잠금) — P8-5**
- 기타: 사이드바 폭 사용자 조정(드래그 리사이저), 멀티-anchor 동시 활성 표시, 헤딩 hover 시 anchor 링크 복사 버튼

---

## Open Questions

- Q1: 본문 스크롤 컨테이너가 body인지 article인지 — 현 App 레이아웃 확인 후 sticky vs fixed 폴백 결정 (구현 시 RTL 테스트로 확정)

---

## P8 라운드 리뷰 (architect, 2026-05-01)

| 코드 | 분류 | 요약 | 반영 |
|------|------|------|------|
| P8-1 | Blocking | sidebar-store가 P3-7 패턴 vs 전역 단일 인스턴스 사이에서 자기모순 | **DoD 19줄 옵션 A 채택** — 모듈 최상위 싱글턴 + 훅 export, 마스터 플랜 4.5 `AppSettings` 분류 명시 |
| P8-2 | Advisory | H5/H6 outline 트리 포함 여부 + SidebarView 필터 정책 명확화 | AC2 + 설계 제약 "들여쓰기 정책"에 1구씩 보강 |
| P8-3 | Advisory | `extractOutline` 외부 export 즉시 호출자 0개임을 명시 | 설계 제약 "adapter API 동결 회복"에 1구 보강 |
| P8-4 | Advisory | 빈 outline 시 a11y 메시지 사이클 10 인계 | 미룬 것(사이클 10) 1구 보강 |
| P8-5 | Advisory | scroll-spy 일시 정지 정책 사이클 10 인계 | 미룬 것(사이클 10) 1구 보강 |
| P8-6 | Advisory | localStorage 접근/파싱 실패 fallback | DoD 19줄 sidebar-store 항목에 1구 보강 |
| P8-7 | Advisory | ⌘1/⌘2 와 사이클 9 macOS 표준 메뉴 충돌 검증 | 미룬 것(사이클 9) 1구 보강 |
| P8-8 | Advisory | AC10 회귀 초과 시 사이클 9 앞당김 트리거 명시 | DoD B.완비 항목에 1구 보강 |

**종합 결론**: 조건부 통과 → P8-1 Blocking 옵션 A로 해소, P8-2~P8-8 권고 모두 1줄씩 반영 완료. developer 진행 가능.

---

## 완료 메모 (2026-05-01)

**상태**: ✅ 완료  
**산출물**: 255 tests (+31), 회귀 p50 4.39ms (변동 0%), outline-extractor.ts + sidebar 4개 컴포넌트 + sidebar-store + ⌘1/⌘2 핸들러  
**architect 리뷰**: P8 라운드 8건 모두 흡수(P8-1 옵션 A + P8-2~P8-8 권고)  
**code-reviewer**: CR8 Major 5건 모두 수정 완료  
**사이클 9 인계 부채**: 추가 3건(CR8-6/7/8) + 사이클 7 부채 4건 유지 = 총 7건
