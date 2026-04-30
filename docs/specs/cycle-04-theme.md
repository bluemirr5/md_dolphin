# 사이클 4 — 타이포그래피 & 테마 시스템

**상태**: Ready
**선행**: 사이클 3 커밋 `1a59e8e` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R3 TDD 의무 (theme-store·watchTheme IPC·ThemeProvider DOM 주입). App.tsx 통합·CSS 토큰 정의·시각 fixture는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/shared/theme-types.ts` — `RenderingTheme = 'light' | 'dark'`, `ThemeUpdatePayload = { theme: RenderingTheme, source: 'native'|'manual' }`
- [ ] `src/shared/ipc-channels.ts` 갱신 — `API_GET_THEME = 'api:getTheme'` (renderer→main invoke), `API_THEME_UPDATED = 'api:themeUpdated'` (main→renderer push) 2개 추가. `API_WATCH_THEME` 채널은 정의하지 않음 — preload `watchTheme(cb)`은 `API_THEME_UPDATED`를 직접 구독 (사이클 3 `onDocumentOpened` 패턴 일치, P4-1)
- [ ] `src/main/theme-service.ts` — `getCurrentTheme(): RenderingTheme` (nativeTheme.shouldUseDarkColors → 'dark'|'light'), `watchTheme(send: (p: ThemeUpdatePayload) => void): () => void` (nativeTheme.on('updated') 등록 + dispose 반환)
- [ ] `src/main/ipc-handlers.ts` 갱신 — `ipcMain.handle(API_GET_THEME)` 추가, ready 시점에 `nativeTheme.on('updated')` 등록 → 모든 BrowserWindow에 `webContents.send(API_THEME_UPDATED, payload)` broadcast
- [ ] `src/main/index.ts` 갱신 — theme-service 등록, 윈도우 close 시 listener 누수 방지 (DocumentWindow Map 재사용)
- [ ] `src/preload/index.ts` 갱신 — `window.api.getTheme(): Promise<RenderingTheme>`, `window.api.watchTheme(cb: (p: ThemeUpdatePayload) => void): () => void` 추가 (ipcRenderer.on subscribe + dispose 반환)
- [ ] `src/preload/api.d.ts` 갱신 — `getTheme`, `watchTheme` 타입 선언 추가 (사이클 3 표면 4개 → 6개)
- [ ] `src/renderer/src/store/theme-store.ts` — Zustand 앱 전역 단일 인스턴스 `useThemeStore` (theme: RenderingTheme, setTheme: (t) => void). 윈도우당 1 store가 아닌 앱 전역 — 모든 윈도우 동일 테마 (마스터 플랜 5.2)
- [ ] `src/renderer/src/context/ThemeProvider.tsx` — mount 시 `api.getTheme()` 1회 호출 + `api.watchTheme(setTheme)` 구독, unmount 시 dispose. `document.documentElement.dataset.theme = theme` 세팅 (CSS 변수 스코프 진입점)
- [ ] `src/renderer/src/styles/theme.css` — CSS 변수 토큰. `:root[data-theme='light']` light 팔레트, `:root[data-theme='dark']` dark 팔레트 동일 변수명(`--bg`, `--text`, `--quote-bar`, `--code-bg`)으로 재정의 (마스터 플랜 5.2)
- [ ] `src/renderer/src/styles/typography.css` — 본문 폭 680px, 행간 1.7, 17px 기본, 시스템 폰트 + Apple SD Gothic Neo·Pretendard, H1~H4 32/26/20/18px, 한글 자간 -0.01em, 단락 간격 1.2em (마스터 플랜 5.1)
- [ ] `src/renderer/src/components/MarkdownRenderer.tsx` 갱신 — 컨테이너에 `className="md-content"` 적용 (CSS 변수·타이포 토큰 스코프). 컴포넌트 인터페이스(props) 변경 없음 — 사이클 2 동결 유지
- [ ] `src/renderer/src/main.tsx` (또는 `App.tsx`) 갱신 — `<ThemeProvider>` 외부 래핑 → `<DocumentProvider>` 내부. theme.css·typography.css import (사이클 3 P3-6 합류 순서 준수)
- [ ] `tests/renderer/theme-store.test.ts` — TDD: 초기값 'light', setTheme('dark') 후 구독자 알림, 동일 값 set 시 알림 1회만(getState 안정)
- [ ] `tests/preload/watch-theme.test.ts` — TDD: ipcRenderer.on 등록 + dispose 함수 호출 시 removeListener, getTheme이 ipcRenderer.invoke(API_GET_THEME) 결과 반환
- [ ] `tests/renderer/theme-provider.test.ts` — TDD: mount 시 documentElement.dataset.theme = api.getTheme() 결과, watchTheme push 시 dataset 갱신, unmount 시 dispose 호출
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 5 시작 전)**

- [ ] `src/main/index.ts` 갱신 — `createMainWindow()` 시 `nativeTheme.shouldUseDarkColors`로 `backgroundColor` 동적 결정 ('#FAFAF7' light / '#1C1C1E' dark) — ThemeProvider await 동안 첫 paint 색상 일치 (P4-3)
- [ ] `tests/fixtures/ko-readme-01.md` ~ `ko-readme-05.md` — 한국어 본문·H1~H4·인용·코드블록·리스트 혼합 fixture 5종 (사이클 5 GFM 회귀 + 사이클 9 가상화 stress 재사용)
- [ ] `pnpm dev` → 시스템 외관 변경 시(System Settings > Appearance) 라이브 반영 시각 검증 1회

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | theme-store | 초기 'light' / setTheme 알림 / 동일 값 멱등 한 라운드 완성 |
| R2 | preload watchTheme + getTheme | ipcRenderer.invoke·on subscribe + dispose removeListener |
| R3 | ThemeProvider | mount 시 getTheme→dataset.theme, watchTheme push 시 갱신, unmount dispose |
| 사후 | theme-service main IPC, theme.css·typography.css 토큰, MarkdownRenderer 클래스, App.tsx 합류, ko fixture, nativeTheme 라이브 검증 | AC4~AC10 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `useThemeStore` 초기 theme === 'light', `setTheme('dark')` 후 구독자 1회 알림. 동일 값 재set 시 추가 알림 없음 | pnpm test |
| AC2 | preload `watchTheme(cb)` 반환 dispose() 호출 시 ipcRenderer.removeListener 호출 (구독 누수 0) | pnpm test |
| AC3 | ThemeProvider mount → `document.documentElement.dataset.theme`이 `api.getTheme()` 결과와 일치. watchTheme push('dark') 시 dataset 갱신 | pnpm test (RTL + api mock) |
| AC4 | main `theme-service.getCurrentTheme()` → `nativeTheme.shouldUseDarkColors` true 시 'dark', false 시 'light' | pnpm test (nativeTheme mock) |
| AC5 | `nativeTheme.on('updated')` 발화 시 `isDestroyed() === false`인 BrowserWindow에만 `webContents.send(API_THEME_UPDATED, { theme, source: 'native' })` 호출 (destroyed 윈도우는 skip) | pnpm test (mock app + 2 win 중 1개 destroyed) |
| AC6 | preload `window.api` 표면: `openFile`, `readFile`, `openExternal`, `getDroppedFilePath`, `getTheme`, `watchTheme` 6개. ipc-channels.ts에 `API_GET_THEME`, `API_THEME_UPDATED` 2개 신규 export (사이클 5 미포함) | pnpm typecheck (api.d.ts) |
| AC7 | theme.css `:root[data-theme='light']`·`:root[data-theme='dark']` 양 블록에 `--bg`, `--text`, `--quote-bar`, `--code-bg` 4개 변수 정의 (마스터 플랜 5.2 색상 일치) | 수동 grep |
| AC8 | typography.css `.md-content` 본문 폭 680px·행간 1.7·17px, H1 32px / H2 26px / H3 20px / H4 18px, 한글 자간 -0.01em, 단락 1.2em | 수동 grep |
| AC9 | `pnpm dev` → System Settings > Appearance Light↔Dark 토글 시 본문 배경·텍스트 즉시 전환 (재시작 불필요) | 수동 1회 |
| AC10 | `tests/fixtures/ko-readme-*.md` 5종 모두 `pnpm dev`에서 렌더링 시 한글 자간·행간·코드블록 배경 시각적 정상 | 수동 1회 |

---

## 설계 제약

- **theme-store 전역 단일 인스턴스**: document-store의 factory 패턴과 달리 모듈 최상위 `useThemeStore` export 허용 — 모든 윈도우가 동일 시스템 테마 공유, 윈도우별 독립 상태 불필요 (마스터 플랜 5.2)
- **CSS 변수 진입점 단일화**: `document.documentElement.dataset.theme`만 사용. `<body>`나 컨테이너 클래스 분기 금지 — `:root[data-theme]` 셀렉터 1지점, 사이클 9 인쇄 미디어 쿼리도 동일 진입점 재사용
- **dark 변수명 동일 키 재정의**: `--bg-dark` 같은 별도 키 금지. `:root[data-theme='dark']` 블록에서 `--bg`를 다시 정의 — 컴포넌트 CSS는 분기 무지(`color: var(--text)`만 작성), 향후 사용자 테마 추가 시 변수 키 동결
- **nativeTheme listener 누수 방지**: `nativeTheme.on('updated')`는 main 프로세스 단일 등록. listener 자체는 app quit까지 유지 — 윈도우 단위 register/dispose 금지 (이중 알림 방지). broadcast 시 각 윈도우에 대해 `win.isDestroyed() || win.webContents.isDestroyed()` 가드 의무 — destroyed 윈도우 send는 예외 발생 (P4-2)
- **ThemeProvider 합류 순서**: `<ThemeProvider>`(외·앱 전역) → `<DocumentProvider>`(내·윈도우 단위). 사이클 3 P3-6 결정 준수 — Theme이 Document보다 수명 길고 의존 없음
- **getTheme 초기 sync 보장**: ThemeProvider mount 시 `api.getTheme()` await 후 첫 paint — 라이트→다크 깜빡임(FOUC) 방지. await 미완 시 dataset.theme 미설정으로 두고 첫 paint는 light fallback (CSS 기본값)
- **watchTheme dispose 의무**: ThemeProvider unmount 시 dispose 호출. preload는 `ipcRenderer.on` subscribe 후 unsubscribe 함수 반환 — Strict Mode 이중 mount에서 listener 누적 방지. Strict Mode mount→unmount→remount에서 preload listener는 dispose→재등록으로 1개만 생존(R3에서 unmount→remount 시나리오 검증). main 측 nativeTheme listener는 ThemeProvider 수명과 무관(app 수명) — 윈도우/Provider 생명주기에 무관하게 단일 등록 유지 (P4-5)
- **manual theme override 미지원**: 본 사이클은 `source: 'native'`만 처리. `source: 'manual'` 페이로드 타입은 정의하되 송신부 미구현 — 사이클 10 사용자 설정 UI에서 활용
- **MarkdownRenderer prop 동결**: 사이클 2 컴포넌트 인터페이스 유지. theme prop·useThemeStore 직접 구독 금지 — `.md-content` 클래스 + CSS 변수만으로 테마 반영 (재렌더 0)
- **CSS 모듈 미사용**: 글로벌 `theme.css` + `typography.css` import만 사용. CSS-in-JS·CSS Modules 도입 금지 — 사이클 9 인쇄 스타일·미디어 쿼리에서 글로벌 셀렉터 우선
- **fixture 한국어 비중**: ko-readme fixture 5종 모두 한글 본문 70% 이상 — 자간·폰트 fallback(Apple SD Gothic Neo) 시각 검증 목적. 영문 위주 fixture는 사이클 5 GFM 전용
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 접근성 — 시스템 외관 추종 자체가 prefers-color-scheme 충족, 추가 ARIA 불필요. 보안 — CSS만 추가, 신규 IPC 표면은 read-only(getTheme·watchTheme), path 인자 없음. 1만 줄 회귀 — 사이클 5/9 의무. 인쇄 미디어 — 사이클 9
- **IPC 채널명 상수 단일화**: 사이클 3 P3-1 결정 재확인. `API_GET_THEME`·`API_THEME_UPDATED` 모두 `src/shared/ipc-channels.ts`만 import
- **RenderingTheme = resolved 테마**: 항상 `'light' | 'dark'` (실제 DOM에 적용된 결과). 사용자 의도(`'auto'` 포함)는 사이클 10에서 별도 타입 `ThemeIntent = 'light' | 'dark' | 'auto'` 도입 예정 — 본 사이클은 native source 기준 resolved만 다룸. main `theme-service.getCurrentTheme()`은 resolve된 결과만 반환 (P4-7)

---

## 미룬 것

- 사이클 5: GFM (table·strikethrough·task list), 1만 줄 회귀 게이트 첫 적용
- 사이클 7: 이미지, `mddolphin-asset://` 핸들러
- 사이클 8: TOC 사이드바
- 사이클 9: react-virtuoso 가상화, 인쇄 미디어 쿼리(`@media print`), 메모리 모니터링
- 사이클 10: 사용자 테마 override UI(`source: 'manual'` 활성화), 폰트 크기 조정, i18next, 에러 UX

---

## Open Questions

- Q1: ThemeProvider 첫 paint FOUC — 1단계: main의 `BrowserWindow backgroundColor`를 `nativeTheme.shouldUseDarkColors` 기반 결정 (P4-3). 2단계: ThemeProvider mount 시 `api.getTheme()` await — 두 단계 모두 native sync이므로 인지 가능 깜빡임 0 추정. 사이클 9 cold start 측정에서 재검토

---

## 변경 이력

| 라운드 | 항목 | 내용 |
|--------|------|------|
| P4-1 | IPC 채널 단순화 | `API_WATCH_THEME` 제거, `API_GET_THEME`(invoke) + `API_THEME_UPDATED`(push) 2개로 통일. AC6 갱신 |
| P4-2 | broadcast destroyed 가드 | `win.isDestroyed()` + `webContents.isDestroyed()` 가드 의무, AC5 mock 케이스 보강 |
| P4-3 | BrowserWindow 초기 backgroundColor | nativeTheme 기반 동적 결정으로 첫 paint FOUC 회피, DoD B 추가, Q1 갱신 |
| P4-5 | Strict Mode listener 안전성 명시 | preload listener는 ThemeProvider 수명, main listener는 app 수명 분리 명시 |
| P4-7 | RenderingTheme = resolved 테마 | `'light' \| 'dark'` resolved만 — `'auto'` 의도는 사이클 10 `ThemeIntent` 별도 타입 |
