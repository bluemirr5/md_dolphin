# 03. 사이클 분할

> 이 파일은 마스터 플랜의 **6장 전체**를 다룹니다 — 사이클 표(6.1), 사이클 1·10·11a·11b 산출물 상세, TDD 가이드, 의무 기재 항목.
> 인덱스: `docs/plans/README.md`
> **갱신 빈도**: 사이클 종료 시 사이클 표(6.1)에 부채/완료 메모 추가. doc-writer 의무 갱신 영역.
> **spec-writer가 가장 자주 read하는 파일**.

---

## 6. 사이클 분할

각 사이클은 **1~3일 분량**으로 응집도 있게.

### 6.0 변경 사항 (이전 SwiftUI 플랜 대비)

| 변경                     | 내용                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **사이클 1 전면 재작성** | Xcode 프로젝트 → Electron + Vite + React + TS 부트스트랩. 모든 작업이 셸에서 진행되도록 스크립트 정착.                                                                                   |
| **사이클 2 도구 변경**   | swift-markdown → markdown-it. 자체 SwiftUI 렌더러 → 자체 React 렌더러. **렌더러 인터페이스는 가상화 친화 청크/슬라이스로 표현 (P2-5)**.                                                  |
| **사이클 3 변경**        | security-scoped bookmark → Electron의 `dialog.showOpenDialog` + `app.on('open-file')`. Info.plist 대응 = electron-builder의 `extendInfo`. **`DocumentWindow.baseDir` 보유 의무 (P2-7)**. |
| **사이클 4 변경**        | SwiftUI Environment → React Context + CSS 변수. `nativeTheme` 기반 자동 추종.                                                                                                            |
| **사이클 5 변경**        | GFM. **1만 줄 fixture 회귀 게이트 추가 (P2-5)**. markdown-it `html: false` 의무 (P2-8).                                                                                                  |
| **사이클 6 변경**        | Splash → shiki. **1만 줄 fixture 회귀 게이트**. shiki nonce는 Phase 2. **사이클 5 부채 정리 끼워넣기** (5항목): ① inline 토큰 재귀 통일(`strong_open`/`em_open` 중첩 마크업 손실 수정) ② `renderTokens` export 제거 ③ App.tsx EMPTY_HINT_TEXT 데모 정리 ④ html_inline 우회 패턴 재검토 ⑤ gfm.css 표 색상 검토. |
| **사이클 7 변경**        | 이미지·인용문·외부링크. **DOMPurify `style` 속성 strip 의무 (P2-2)**. **로컬 자산 protocol 화이트리스트 (P2-7)**. **1만 줄 fixture 회귀 게이트**.                                        |
| **사이클 8 변경**        | OutlineExtractor를 TypeScript로 재작성.                                                                                                                                                  |
| **사이클 9 변경**        | 성능 검증 + **가상 스크롤(`react-virtuoso`) 도입을 명시적 산출물로 추가**. SwiftUI LazyVStack 대비 React 가상화 라이브러리는 더 명시적 작업. **4.7.3 성능 벤치 표준 적용**.              |
| **사이클 10 그대로**     | 에러 UX·접근성(웹 a11y)·i18n. String Catalog → i18next + JSON locale.                                                                                                                    |
| **사이클 11a 변경**      | create-dmg → `electron-builder --mac dmg --universal`. CI는 GitHub Actions macOS 러너. **빌드 시간 측정(목표 30분) + 초과 시 arm64 우선 릴리스 옵션 (P2-10)**.                           |
| **사이클 11b 변경**      | Homebrew Cask + 거버넌스 + 안내. dmg 크기 안내(약 130MB). **`auto_updates: false` + `livecheck` GitHub Releases (P2-11)**.                                                               |

### 6.1 사이클 표

| #   | 사이클명                                         | 목표                                                                                                                                                                                                                                                                                                           | 주요 산출물                                                                                                                         | 의존    | TDD                             |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| 1   | **프로젝트 부트스트랩**                          | Electron + Vite + React + TS 프로젝트 생성. 빈 BrowserWindow 띄우기. main/preload/renderer 분리. contextIsolation/sandbox 설정. pnpm/스크립트 정착.                                                                                                                                                            | `package.json`, `vite.config.ts`, `electron/main.ts`, `electron/preload.ts`, `src/renderer/App.tsx`, `npm run dev` 동작             | -       | 사후                            |
| 2   | **MarkdownRenderer 기초**                        | `MarkdownDocument` 도메인 모델 정의(입력 인터페이스 못박음). markdown-it으로 토큰 추출, 자체 React 렌더러로 **최소 노드**(헤딩 H1~H4, 문단, 링크, 인라인 코드, 코드 블록 plain). **렌더러 인터페이스는 가상화 친화 청크/슬라이스로 표현 (P2-5)**. **1만 줄 fixture(`tests/fixtures/large-10k.md`) 표준 정착**. | `MarkdownDocument` 인터페이스, `MarkdownRenderer` 컴포넌트, `Heading`/`Outline` 도메인 타입, 토큰→React 변환 어댑터, 1만 줄 fixture | 1       | **TDD** (도메인 모델·헤딩 추출) |
| 3   | **파일 열기와 윈도우 관리**                      | Finder 더블클릭(`open-file` 이벤트), 드래그앤드롭, ⌘O. main↔renderer IPC. 윈도우 단위 `MarkdownDocument` 보유. **`DocumentWindow.baseDir` 보유 (P2-7)**. **실제 파일을 사이클 2 렌더러에 흘려넣어 인터페이스 검증**.                                                                                           | `FileService` (main), preload `contextBridge` API, `DocumentWindow`(baseDir 포함), electron-builder `extendInfo`로 .md 연결         | 2       | **TDD** (FileService)           |
| 4   | **타이포그래피 테마 시스템**                     | 본문 폰트·행간·여백·색상 토큰화 (CSS 변수). `nativeTheme` 자동 전환. ThemeProvider Context. 한국어 README 5개로 시각 검증.                                                                                                                                                                                     | `RenderingTheme` 모델, light/dark CSS 변수 세트, 시스템 외관 추종 IPC                                                               | 2, 3    | **TDD**                         |
| 5   | **GFM 요소 렌더링 강화**                         | 표, 체크박스, 취소선, 자동 링크. 자체 렌더러에 점증적 추가. markdown-it GFM 플러그인 검증 (사이클 시작 전 0.5일 스파이크). markdown-it `html: false` 의무. **1만 줄 회귀 ≤ 5초 게이트 (P2-5)**.                                                                                                                | 각 GFM 요소 React 컴포넌트, 시각 회귀 스냅샷, 1만 줄 회귀 측정                                                                      | 2, 4    | 사후                            |
| 6   | **코드 블록 일반인 친화 디자인**                 | 부드러운 카드, 언어 라벨, **shiki 신택스 하이라이팅**, 복사 버튼. **1만 줄 회귀 ≤ 5초 게이트**. **사이클 5 부채 정리(끼워넣기)**: ① `MarkdownRenderer.tsx`의 `strong_open`/`em_open` 인라인 처리를 `renderInlineTokens` 재귀로 통일(`**[link](url)**` 등 중첩 마크업 손실 방지) ② `adapter.ts`의 `renderTokens` export 제거(사이클 2 동결 "외부 API는 `parseMarkdown`만" 위반 해소). **추가 정리 항목**: ③ App.tsx EMPTY_HINT_TEXT 데모 콘텐츠 정리 ④ html_inline 우회 패턴 검토(사이클 7 DOMPurify 정책 재확인) ⑤ gfm.css 표 색상 대비 검토(라이트 모드 셀 테두리). | `CodeBlockView`, shiki 1.29.2, 커스텀 테마 (`light-soft`, `dark-soft`), 복사 버튼, inline 재귀 통일 리팩터, 부채 정리 5항목 | 4, 5    | 사후                            |
| 6   | **✅ 완료 — shiki 통합 + 부채 정리** | 구현 162 tests (+26), 회귀 p50 6.25ms ≤ 5초 합격. P6 라운드 8건 흡수(특히 P6-1 WeakMap 캐시로 MarkdownDocument.tokens 필드 제거). code-reviewer 차단 2건 즉시 수정(codeblock.css 무효 규칙, export 제거). | 부채 ④ `docs/notes/cycle-06-html-inline-review.md` 생성 완료(사이클 7 DOMPurify allowlist 참조 의무). **+ 사이클 6 부채 메모**: shiki dual theme 라이트색상 inline style 직접 주입(변수 미주입), vitest mock 격리 신뢰성, highlighter 무한 재시도, clipboard 실패 피드백, 빌드 청크 700KB+(사이클 9 lazy loadLanguage로 자동 해소) | - | - |
| 7   | **✅ 완료 — 이미지·링크·인용문 + DOMPurify** | 224 tests (+62), 회귀 p50 4.39ms ≤ 5초 합격(-29.7%). P7 라운드 13건 흡수(IPC 중복제거·shiki style 함수형·SVG/data:svg 차단·CSP 통일·windowId preload 주입·토큰 동결 회복·테스트 보강). **dompurify@3.4.1 신규 의존성**. CSP `default-src 'none'` 표준 적용(4.4/4.4.1). 로컬 자산 URL `mddolphin-asset://<windowId>/<relPath>` 명시(4.4.2). | **사이클 9 인계 부채 4건**: CR7-5(Image useMemo), CR7-9(sanitize top-level window), CR7-10(TOCTOU O_NOFOLLOW), CR7-11(windowId -1 가드). CR7-12(blockquote inline 단독 토큰)는 현 markdown-it 동작 미발생 — 미룬 것 노트만 | 5       | 사후                            |
| 8   | **✅ 완료 — Outline 분리 + 사이드바** | OutlineExtractor TS 모듈 분리(adapter 6개 헬퍼) + 목차 사이드바(SidebarView/Toggle/useScrollSpy/scrollToAnchor) + ⌘1/⌘2 + sidebar-store 싱글턴. 255 tests (+31), 회귀 p50 4.39ms (변동 0%). P8 라운드 8건 흡수(P8-1 옵션 A), CR8 Major 5건 수정 완료. | OutlineExtractor 모듈, SidebarView·Toggle 컴포넌트, useScrollSpy hook, scrollToAnchor 함수, sidebar-store 싱글턴. **사이클 9 인계 부채 추가 3건**: CR8-6/7/8. 사이클 7 부채 4건 유지(CR7-5/9/10/11). | 2       | 완료                            |
| 9   | **확대/축소 + 시스템 메뉴 + 성능 + 가상 스크롤** | ⌘+/-, ⌘0, macOS 표준 메뉴, 인쇄, PDF 저장. **4.7.3 성능 벤치 표준**으로 측정: 1만 줄 1초, 메모리 500MB, 콜드 스타트 1.5초. **`react-virtuoso` 가상 스크롤 도입**. **shiki lazy `loadLanguage` 전환(빌드 청크 700KB+ 해소), shiki 캐시 가상화 mount/unmount 측정, shiki 무한 재시도 차단, dual theme 커스텀 `light-soft/dark-soft` JSON 도입 검토(사이클 6 부채 메모)**. 5/6/7 회귀 게이트가 5초를 초과했다면 본 사이클을 앞당겨 진행. **+ 사이클 8 부채 7건 처리: CR7-5/9/10/11(4건) + CR8-6/7/8(3건). 추가 미룬 항목: 가상화 환경 점프 검증, ⌘1/⌘2 메뉴 충돌 검증(P8-7)**: Image useMemo(CR7-5), sanitize top-level window 격리(CR7-9), asset-protocol TOCTOU O_NOFOLLOW(CR7-10), windowId -1 가드(CR7-11) | 메뉴 명령 핸들러 (main), 벤치마크 측정 보고서, `react-virtuoso` 통합, shiki lazy 전환, 캐시 정책 측정, **부채 7건 처리**                                                                | 3, 6, 7, 8 | TDD (벤치)                      |
| 10  | **폴리싱 — 에러 UX · 접근성 · i18n**             | 손상된 .md/인코딩/권한/큰 파일 에러 UX. ARIA 라벨링, 키보드 네비게이션, 동적 폰트 스케일. **i18next** + ko/en JSON locale.                                                                                                                                                                                     | `ErrorState` 모델·UI, ARIA 트레이트, `locales/ko.json`, `locales/en.json`                                                           | 모두    | TDD (에러 분기 로직)            |
| 11a | **OSS 배포 — 빌드 + DMG + Releases**             | `electron-builder --mac dmg --universal`. GitHub Releases 자동화(GitHub Actions macOS 러너). macOS 12·13·14·15 양쪽 검증. **빌드 시간 30분 이내 측정 (P2-10)**.                                                                                                                                                | electron-builder 설정, GitHub Actions 워크플로 YAML, 릴리스 노트 템플릿, 빌드 시간 보고                                             | 모두    | -                               |
| 11b | **OSS 배포 — Homebrew + 거버넌스 + 안내**        | Homebrew Cask, README(Gatekeeper 우회 안내, 번들 크기 안내), 4개 거버넌스 문서, Phase 2 전환 준비. **Cask `auto_updates: false` + `livecheck` GitHub Releases (P2-11)**.                                                                                                                                       | Cask 정의, README, LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md                                                        | 11a     | -                               |

### 6.2 사이클 1 (부트스트랩) — 산출물 상세 (CLI-only 강조 + P2-4 분리)

**목표**: 사용자가 Xcode 한 번도 열지 않고, `npm run dev`로 빈 윈도우를 띄우는 것.

**산출물 분리 (P2-4)**:

#### 필수 (사이클 1 종료 조건)

부트스트랩 최소 — 빈 윈도우 + 보안 기본값까지.

- [ ] `package.json` (스크립트: `dev`, `build`, `lint`, `test`)
- [ ] `tsconfig.json` (strict, ES2022, moduleResolution: bundler)
- [ ] `vite.config.ts` + `vite-plugin-electron` 또는 `electron-vite` 채택
- [ ] `electron/main.ts` — BrowserWindow 생성, contextIsolation/sandbox 활성, preload 로드
- [ ] `electron/preload.ts` — `contextBridge.exposeInMainWorld('api', {})` (빈 객체로 시작)
- [ ] `src/renderer/main.tsx` + `App.tsx` (React 진입점)
- [ ] CSP `<meta>` 태그 (사이클 1부터 의무) — 4.4.1 결정 반영
- [ ] `.gitignore` (node_modules, dist, out, release)
- [ ] `npm run dev`로 빈 윈도우(배경 색상만 적용된) 띄우기 검증

#### 완비 (사이클 2 시작 시까지)

테스트 인프라 + 빌드 스크립트 + lint 정착.

- [ ] `pnpm-workspace.yaml` (선택 — monorepo 시)
- [ ] Vitest 설정 (`vitest.config.ts`) + 더미 유닛 테스트 1개
- [ ] ESLint + Prettier 설정 (`.eslintrc`, `.prettierrc`) + `pnpm lint` 동작
- [ ] `pnpm build` (tsc + vite build) 동작 — 단순 production 번들 검증
- [ ] CI 골격 (`.github/workflows/ci.yml`) — PR마다 `pnpm lint && pnpm test && pnpm build`

#### 사이클 11a 직전까지 미룰 수 있는 산출물

- [ ] `pnpm dist` (electron-builder) — **사이클 11a에서 본격 설정**. 사이클 1에서는 미설정 가능.

**셸 명령 검증**:

```bash
pnpm install
pnpm dev      # Vite dev + Electron 동시 실행 (필수)
pnpm build    # tsc + vite build (완비)
# pnpm dist 는 사이클 11a에서 설정
```

### 6.3 사이클 10 (폴리싱: 에러 UX·접근성·i18n) — 산출물 상세

**산출물**:

1. **에러 UX**
   - [ ] 손상된 .md (UTF-8 디코딩 실패) — "이 파일은 마크다운 형식이 아닐 수 있어요"
   - [ ] 인코딩 오류(EUC-KR 등) — `iconv-lite` 등으로 자동 감지 시도 + 안내
   - [ ] 권한 오류 — "이 파일에 접근할 수 없어요" 안내
   - [ ] 큰 파일 (10MB+) 경고 — 시간 안내 + 취소 버튼
   - [ ] 빈 파일 — 빈 상태 일러스트

2. **접근성 (웹 a11y)**
   - [ ] ARIA 라벨링 — 모든 인터랙티브 요소
   - [ ] 동적 폰트 스케일 — `em` 기반 폰트 + 사용자 zoom 설정
   - [ ] 키보드 네비게이션 — Tab/Shift+Tab 포커스, 사이드바 ⌘1, 본문 ⌘2
   - [ ] 색상 대비 검증 — WCAG AA 4.5:1 자동 검증 (axe-core 통합)
   - [ ] `prefers-reduced-motion` 대응 — 부드러운 스크롤 비활성

3. **i18n 인프라**
   - [ ] **i18next** + `react-i18next` 도입
   - [ ] `locales/ko.json`, `locales/en.json` (메뉴, 다이얼로그, 에러 메시지 모두)
   - [ ] `app.getLocale()` 기반 시스템 언어 자동 추종, 사용자 강제 선택은 Phase 2

### 6.4 사이클 11a (배포 — 빌드 + DMG + Releases) — 산출물 상세

**목표**: GitHub Releases를 통해 비개발자가 안전하게 다운로드할 수 있는 미서명 DMG를 자동 배포한다. **모든 작업이 셸에서 완결된다.**

**산출물 체크리스트**:

1. **electron-builder 설정 (`electron-builder.yml` 또는 `package.json` `build` 섹션)**
   - [ ] `mac.target: dmg`, `mac.arch: ['x64', 'arm64']` (Universal Binary)
   - [ ] `mac.category: public.app-category.productivity`
   - [ ] `mac.extendInfo.CFBundleDocumentTypes` — `.md` 파일 연결
   - [ ] `mac.identity: null` (서명 비활성, 미서명 DMG)
   - [ ] `dmg.title: md_dolphin ${version}`, Applications 드래그 안내 배경
   - [ ] `compression: maximum` (번들 크기 최소화)

2. **빌드 산출물**
   - [ ] DMG 파일명 규칙: `md_dolphin-{version}-mac-universal.dmg`
   - [ ] SHA256 체크섬 자동 생성 (`shasum -a 256`)
   - [ ] 빌드 후 dmg 크기 측정 → 130MB 이내 목표

3. **GitHub Actions 워크플로 (`.github/workflows/release.yml`)**
   - [ ] 트리거: tag push (`v*.*.*`)
   - [ ] 러너: `macos-14` (Apple Silicon arm64 지원)
   - [ ] 단계: checkout → setup-node → pnpm install → pnpm dist → upload-release-asset
   - [ ] DMG + sha256 자산 첨부

4. **빌드 시간 측정 (P2-10)**
   - [ ] **CI 단계 시간 측정**: `time pnpm dist` 또는 GitHub Actions step duration 기록
   - [ ] **목표: 30분 이내**. macos-14 러너는 arm64이므로 x64 크로스 컴파일 비용이 가산됨.
   - [ ] **초과 시 개선 옵션**:
     - (a) **arm64 우선 릴리스**: `mac.arch: ['arm64']`만 빌드 → 첫 릴리스 후 별도 워크플로로 x64 후속.
     - (b) `compression: store` 임시 적용으로 빌드 단축(번들 크기 vs 빌드 시간 트레이드오프).
     - (c) ICU 데이터 등 불필요 리소스 제거.

5. **macOS 양쪽 검증**
   - [ ] macOS 12 Monterey, 13 Ventura, 14 Sonoma, 15 Sequoia에서 빌드·실행·열기 검증
   - [ ] 각 버전별 Gatekeeper 우회 절차 차이 기록

### 6.5 사이클 11b (배포 — Homebrew + 거버넌스 + 안내) — 산출물 상세

**산출물 체크리스트**:

1. **Homebrew Cask** (P2-11 반영)
   - [ ] 자체 tap (`yourname/homebrew-md-dolphin`) 운영 또는 공식 cask PR
   - [ ] **Phase 1 Cask 정의**:
     - `auto_updates: false` (수동 업데이트 — 미서명이라 자동 갱신 메커니즘 부재)
     - `livecheck do url :url; strategy :github_latest; end` (GitHub Releases 추적)
     - `depends_on macos: ">= :monterey"` (macOS 12 이상)
   - [ ] **Phase 2 Cask 변경**(노타라이즈 게이트 통과 후):
     - `auto_updates: true`로 변경 (electron-updater 도입과 함께)
   - [ ] `brew install --cask md-dolphin` 검증

2. **README의 "Gatekeeper 우회 안내"**
   - [ ] 한국어/영어 양쪽
   - [ ] 단계별 스크린샷:
     1. DMG 다운로드 → 더블클릭
     2. Applications 폴더로 드래그
     3. 첫 실행: 우클릭 → "열기"
     4. 경고창에서 "열기" 재확인
     5. 정상 실행 화면
   - [ ] **번들 크기·메모리 솔직 표기 (결정 12)**: "약 130MB 다운로드, Apple Silicon Mac에서 약 200MB 메모리 사용. Electron 기반이라 다른 macOS 앱보다 큽니다. 자세한 이유는 FAQ 참조."
   - [ ] "왜 이런 안내가 필요한가요?" — Apple Developer Program 미가입 솔직히 설명
   - [ ] SHA256 검증 명령: `shasum -a 256 md_dolphin-x.y.z-mac-universal.dmg`

3. **OSS 거버넌스 문서**
   - [ ] `LICENSE` (MIT 권장 — 사용자 별도 결정 가능)
   - [ ] `CONTRIBUTING.md`
   - [ ] `CODE_OF_CONDUCT.md` (Contributor Covenant)
   - [ ] `SECURITY.md`

4. **CI/CD**
   - [ ] 태그 푸시 시 11a 워크플로 트리거
   - [ ] PR마다 `pnpm lint && pnpm test && pnpm build` 검증

5. **Phase 2 전환 준비**
   - [ ] 노타라이즈 전환 시 필요한 작업 체크리스트 별도 문서 (0.4 사이클 P2-1 참조, `05-changelog.md`)
   - [ ] 결정 게이트 시그널 모니터링 방법 명시 (Issues 라벨 `installation-failure`)
   - [ ] Cask `auto_updates: true` 변경 시 PR 템플릿

### 6.6 TDD 가이드 (spec-writer 참고용)

- **TDD 권장**: 도메인 모델, `OutlineExtractor`, `FileService` (main), `RenderingTheme`, 에러 분기 로직, 토큰→도메인 변환 어댑터, 로컬 자산 protocol 화이트리스트 검증.
- **사후 테스트**: React 컴포넌트 — Vitest + React Testing Library, 또는 Playwright E2E 스냅샷.

### 6.7 각 사이클 spec 가이드 — 의무 기재 항목

각 사이클 스펙에는 **반드시** 다음 항목이 포함되어야 한다:

- [ ] **에러 케이스** — 실패 시나리오와 사용자 노출 메시지
- [ ] **접근성 요구** — ARIA, 키보드, Dynamic Type 영향 (없으면 "해당 없음" 명시)
- [ ] **i18n 영향** — 사용자 노출 문자열이 있으면 i18next 키 등록
- [ ] **보안 영향** — IPC 표면 변경, sanitize 적용 여부, CSP 영향 (Electron 특유 항목)
- [ ] **macOS 분기 정책 영향 (P2-9)** — 본 사이클이 추가하는 OS-specific 호출이 있는가? `process.platform === 'darwin'`로 격리되었는가? (없으면 "해당 없음" 명시)
- [ ] **성능 회귀 영향 (P2-3, P2-5)** — 1만 줄 fixture 회귀 시간 측정 필요 여부 (사이클 5/6/7 의무, 그 외 "해당 없음" 가능)
- [ ] **로컬 자산 접근 정책 영향 (P2-7)** — 4.4.2 화이트리스트 위배 가능성 (해당 없으면 명시)
