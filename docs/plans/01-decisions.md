# 01. 기술 결정

> 이 파일은 마스터 플랜의 **4장 전체**를 다룹니다 — 앱 프레임워크 비교, 마크다운 파싱·렌더링 전략, 시스템 다이어그램, 보안·샌드박스, 상태 관리, 데이터 모델, 빌드 도구, 성능 벤치 표준.
> 인덱스: `docs/plans/README.md`
> **갱신 빈도**: 거의 동결 (P2 라운드 후). 결정 변경 시 반드시 `05-changelog.md` 0.1 표에 P{N}-{i} 라운드로 기록.

---

## 4. 기술 아키텍처

### 4.1 앱 프레임워크 비교 (Electron 채택 사유 정직히 명시)

| 옵션                       | 장점                                                                                              | 단점                                                                       | 점수   |
| -------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| **Electron (1차 채택)**    | **CLI-only 워크플로 완벽 지원**, JS/TS 단일 언어, 마크다운 라이브러리 풍부, electron-builder 성숙 | 번들 100~150MB, RAM 200~300MB, 흰 화면 깜빡임, "개발자 도구" 인상          | **8**  |
| **Tauri (Rust + WebView)** | 번들 5~15MB, 메모리 50~100MB, macOS WKWebView로 한글 조판 우수                                    | Rust 백엔드 학습 곡선, 사용자의 "JS 친숙" 가정 시 부담, 생태계 성숙도 중간 | 7      |
| **SwiftUI 네이티브**       | 최고 macOS 통합, Quick Look 확장 가능, 작은 번들                                                  | **Xcode IDE 강제 → 사용자의 CLI 워크플로와 충돌. 본 결정의 핵심 사유**     | (폐기) |
| **AppKit (Swift)**         | 안정적                                                                                            | Xcode 의존. 위와 동일한 사유로 폐기                                        | (폐기) |
| **Flutter Desktop**        | 크로스플랫폼 가능                                                                                 | macOS 폰트 렌더링 비네이티브, Dart 학습 곡선                               | 4      |

**결정: Electron + TypeScript + React 18 + Vite (macOS 12 Monterey 이상)**

**이유**:

- **사용자 워크플로 정합성** — 모든 작업이 셸에서 끝남. `npm`, `vim`, Claude Code와 자연스럽게 결합.
- **마크다운 생태계** — markdown-it, shiki, remark, sanitize-html 등 검증된 라이브러리 즉시 활용.
- **macOS 최소 버전 완화** — Electron 35는 macOS 11 Big Sur부터 지원하지만, 안정성 마진을 두고 macOS 12 Monterey 이상으로 설정.
- **빌드 도구 표준화** — electron-builder의 `mac.target: dmg` 한 줄로 끝. CI(GitHub Actions macOS 러너)에서 동일 명령 실행.

**포기한 것 (정직히 명시)**:

- 번들 크기·메모리 (Tauri 대비 10배, SwiftUI 대비 30배 수준).
- macOS Quick Look 확장 (사실상 불가).
- 시스템 폰트 렌더링의 미묘한 네이티브 톤 (Chromium 렌더링은 일관되지만 네이티브와 약간 다름).

### 4.2 마크다운 파싱·렌더링 전략 — 파싱과 렌더링 분리 (원칙 유지)

**핵심 원칙**: **파싱과 렌더링은 별개의 관심사이며, 별개의 라이브러리가 책임진다.** 도메인 모델 `MarkdownDocument`(TypeScript 인터페이스)에 라이브러리 AST를 노출하지 않는다.

#### 4.2.1 파싱 — `markdown-it`

| 항목        | 내용                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| 라이브러리  | [`markdown-it`](https://github.com/markdown-it/markdown-it) + GFM 플러그인               |
| 출력 형태   | 토큰 스트림(token list, AST 형태)                                                        |
| CommonMark  | O                                                                                        |
| GFM         | `markdown-it-task-lists`, `markdown-it-table`(기본 포함), `markdown-it-strikethrough` 등 |
| HTML 인라인 | **`html: false`로 시작** (결정 14, P2-8). 사용자 요구 발생 시 allowlist 확장 검토.       |
| 안정성      | npm 다운로드 수 최상위, 광범위 사용 (VuePress, GitHub Pages 등)                          |

**대안 검토**:

- **remark/rehype**: AST 변환 파이프라인 강력. 본 프로젝트는 단순 표시이므로 markdown-it이 가벼움. Phase 2 Mermaid 도입 시 remark 전환 검토 가능.
- **micromark**: CommonMark 사양 충실하지만 markdown-it보다 저수준. 직접 쓰면 보일러플레이트 다수.

**선택 이유**:

- npm 생태계에서 가장 보편적이며 GFM 플러그인 풍부.
- 토큰 스트림이 단순해 도메인 모델로 정규화하기 쉬움.
- 라이브러리 락인 위험 낮음 (토큰 → 도메인 타입 변환 레이어 필수).

#### 4.2.2 파서 전환 비용 가정 (P2-6 반영)

markdown-it 1차 채택은 가벼움·생태계 성숙도에서 적절하지만, **Phase 2의 Mermaid·KaTeX 도입 시 remark/rehype 전환 비용**을 사전 인정해 둔다.

**전환 영향 범위**:

- 직접 영향: `MarkdownRenderer` 내부의 토큰→React 변환 어댑터(사이클 2 산출물). 도메인 모델은 영향 없음(라이브러리 락인 제거 원칙 덕분).
- 간접 영향: GFM 플러그인 의존 코드(사이클 5 산출물) — remark의 `remark-gfm`로 대체 가능.
- 추가 검증: 사이클 6의 shiki 통합은 토크나이저 비의존이므로 영향 없음.

**의사결정 룰** (Phase 2 진입 시점):

| Phase 2 추가 기능    | 권장 파서                                                               | 비고                                                                            |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Mermaid 단독         | **markdown-it 유지** + `markdown-it-mermaid` (또는 자체 fence renderer) | 전환 비용 회피. 가장 보수적.                                                    |
| KaTeX 단독           | **markdown-it 유지** + `markdown-it-katex`                              | 동일. KaTeX 플러그인 다수 검증됨.                                               |
| Mermaid + KaTeX 동시 | **remark 전환 검토**                                                    | AST 파이프라인이 두 확장 모두 더 깔끔. 전환 비용 vs 유지보수 비용 비교 후 결정. |
| 추가 확장 4개+ 누적  | **remark 전환 권장**                                                    | 플러그인 생태계 폭이 더 큼.                                                     |

**Heading.offset 어댑터 검증**:

`Heading.offset`(rawText 내 시작 위치)이 markdown-it 토큰의 `map`(line range)에 직접 의존하지 않도록, **사이클 2 spec에서 어댑터 변환 로직을 명시**한다. 어댑터는:

1. markdown-it 토큰의 `map`(line) → `rawText`의 character offset으로 변환.
2. 변환 결과만 도메인 타입(`Heading.offset`)에 저장.
3. remark 전환 시에는 remark의 `position.start.offset`을 그대로 사용 가능 — 도메인 타입 시그니처 변경 없음.

#### 4.2.3 렌더링 — 자체 React 렌더러 + shiki(코드)

| 단계                        | 구성                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 사이클 2 (최소 노드)        | 헤딩(H1~H4), 문단, 링크, 인라인 코드, 코드 블록(plain) — 자체 React 렌더러로 시작. **인터페이스를 가상화 친화 청크/슬라이스로 표현 (P2-5)** |
| 사이클 4 (테마)             | 자체 렌더러에 CSS 변수 기반 테마 주입, 라이트/다크 자동 (`nativeTheme`)                                                                     |
| 사이클 5 (GFM)              | 표, 체크박스, 취소선, 자동 링크 — 자체 렌더러에 점증적 추가. **1만 줄 fixture 회귀 게이트 (P2-5)**                                          |
| 사이클 6 (코드 블록 폴리싱) | **shiki** 신택스 하이라이팅 (VSCode와 동일한 TextMate 엔진, 색상 미려). **1만 줄 fixture 회귀 게이트**                                      |
| 사이클 7 (이미지·인용문)    | 자체 렌더러에 이미지·인용문 노드 추가, 이미지 라이트박스. **1만 줄 fixture 회귀 게이트**                                                    |
| (보조)                      | 자체 렌더러로 충분한 영역은 직접 구현. 복잡한 Mermaid·KaTeX는 Phase 2에서 외부 라이브러리 위임.                                             |

**선택 이유**:

- 라이브러리의 렌더링 한계에 잠금되지 않음. CSS 변수와 1:1 매핑되어 타이포그래피 품질 극대화.
- shiki는 정적 하이라이팅(빌드 시 스타일 결정 가능)으로 RAM 부담 적음.
- 사이클 단위로 점증적으로 노드를 추가해 부담 분산.

**솔직한 트레이드오프**:

- 자체 렌더러 구현 비용 — 사이클 5 시작 전 0.5일 스파이크로 GFM 표·체크박스 비용 검증.
- shiki는 wasm 기반이라 첫 로드에 약간의 지연 — **사이클 6에서 정적 6~8개 언어 등록 + 모듈 싱글턴으로 wasm 1회 로드 한정. lazy `loadLanguage`는 사이클 9로 이전 (P6-5)** — 빌드 청크 700KB+ 해소 + 가상화 mount/unmount 시 캐시 정책과 함께 측정.

#### 4.2.4 데이터 흐름 다이어그램

```graph
[ .md File ]
     │
     ▼
[ FileService (main process) ] ──IPC──▶ [ MarkdownDocument (renderer 도메인 모델) ]
                                              │  - url: string
                                              │  - rawText: string
                                              │  - outline: Outline
                                              │  - headings: Heading[]
                                              │  (※ markdown-it AST는 노출하지 않음)
                                              ▼
                                        [ MarkdownRenderer (React component) ]
                                              │ 내부에서 markdown-it으로 토큰 추출
                                              │ 토큰 → React Element (자체 렌더러)
                                              │ 코드 블록은 shiki에 위임
                                              ▼
                                        [ Themed React Tree ]
                                              ▲
                                              │ ThemeProvider (Context)
                                              │
                                      [ RenderingTheme (CSS 변수 set) ]
```

### 4.3 시스템 다이어그램

```diagram
┌─────────────────────────────────────────────────────────────────┐
│                     md_dolphin (Electron App)                   │
│                                                                 │
│  ┌────────────────────────┐         ┌────────────────────────┐  │
│  │   Main Process (Node)  │ ──IPC──▶│   Renderer (Chromium)  │  │
│  │                        │         │   React + Vite         │  │
│  │  - BrowserWindow       │         │                        │  │
│  │  - 메뉴 (Application)  │         │  - MarkdownRenderer    │  │
│  │  - FileService         │         │  - SidebarOutline      │  │
│  │  - nativeTheme         │         │  - ThemeProvider       │  │
│  │  - dialog (⌘O)         │         │  - Zustand 스토어      │  │
│  │  - shell.openExternal  │         │  - i18next             │  │
│  └────────────────────────┘         └────────────────────────┘  │
│                ▲                                ▲               │
│                │ contextBridge (좁은 표면)      │               │
│                │ - openFile()                   │               │
│                │ - readFile(path)               │               │
│                │ - watchTheme(callback)         │               │
│                │ - openExternal(url)            │               │
└────────────────┼────────────────────────────────┼───────────────┘
                 │                                │
                 ▼                                │
         macOS Filesystem                         │
         (.md, 이미지, 첨부)                      │
                                                  │
         shell.openExternal ◀─────────────────────┘
         (외부 브라우저로 링크 열기)

Phase 2 확장:
   electron-updater ──▶ 자동 업데이트
   다중 BrowserWindow ──▶ 윈도우별 격리 상태 (이미 MVP에서 준비)
```

**핵심 설계 원칙**:

- **`MarkdownRenderer`는 React 컴포넌트 단일 진입점**. 입력은 `MarkdownDocument` 도메인 인터페이스로 못박는다.
- **Main/Renderer 프로세스 분리**: 파일 I/O는 main, 렌더링은 renderer. Renderer는 Node API에 직접 접근하지 않는다.
- **contextBridge** 로 좁은 IPC 표면만 노출. Renderer가 임의로 파일을 읽거나 명령을 실행할 수 없도록 함.

### 4.4 보안 · 샌드박스 (Electron 특유 항목)

| 항목                          | 설정                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextIsolation`            | **`true`** (의무)                                                                                                                             |
| `nodeIntegration`             | **`false`** (의무)                                                                                                                            |
| `sandbox`                     | **`true`** (renderer 샌드박스)                                                                                                                |
| `webSecurity`                 | `true`                                                                                                                                        |
| `preload` 스크립트            | `contextBridge.exposeInMainWorld('api', {...})` 로 좁은 함수만 노출                                                                           |
| 외부 링크                     | `shell.openExternal(url)`로 위임 — 앱 내부 webview 이동 차단                                                                                  |
| 마크다운 내 HTML              | **markdown-it `html: false`로 시작** (결정 14). DOMPurify는 사용자가 allowlist 확장 시 의무 적용. `<script>`, `on*` 속성, `style` 속성 strip. |
| 로컬 이미지 접근              | custom protocol (`mddolphin-asset://`) — 4.4.2의 화이트리스트 정책 의무 적용                                                                  |
| CSP (Content-Security-Policy) | `default-src 'self'; img-src 'self' https: data: mddolphin-asset:; style-src 'self' 'unsafe-inline'; script-src 'self'` (4.4.1 결정 근거)     |
| CSP 적용 위치                 | **`<meta>` + `session.webRequest.onHeadersReceived` 이중방어** (4.4.1)                                                                        |
| IPC 메시지                    | 모든 IPC 채널에 대해 main 측 입력 검증 (path traversal 방지). `SAFE_EXTERNAL_PROTOCOLS` 상수는 `src/main/security.ts`에서 단일 정의 후 export (사이클 3에서 중복 제거됨, P3-1) |

**보안 위협 모델**:

- 사용자가 신뢰할 수 없는 .md 파일을 열 수 있음 → 마크다운 내 HTML 인젝션이 1차 위협 → markdown-it `html: false` + (allowlist 확장 시) DOMPurify 의무.
- 외부 이미지 URL이 추적 픽셀일 가능성 → 사용자 설정으로 외부 이미지 로딩 토글(Phase 2 후보).
- 외부 링크 클릭은 시스템 기본 브라우저로 위임. 앱 내부에서 절대 열지 않음.
- **로컬 자산 경로 traversal** — 4.4.2의 화이트리스트로 차단.

#### 4.4.1 CSP `style-src 'unsafe-inline'` 결정 근거 (P2-2 반영)

**문제 인식**: CSP에 `style-src 'self' 'unsafe-inline'`을 두면 인라인 스타일이 허용되며, XSS 우회 통로가 될 수 있음. 한편 shiki는 색상을 인라인 `style` 속성으로 출력하므로 unsafe-inline 없이는 동작 어려움.

**옵션 비교**:

| 옵션                                                            | 장점                                             | 단점                                                               |
| --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| **(A) `'unsafe-inline'` 유지 + DOMPurify에서 style 속성 strip** | 단순, shiki 그대로 사용 가능, 1차 출시 부담 낮음 | unsafe-inline 자체는 잔존(이론적 잠재 표면)                        |
| (B) shiki 결과물을 nonce 또는 hash로 묶어 unsafe-inline 제거    | XSS 우회 표면 완전 제거                          | shiki 출력 후처리 비용, nonce 갱신 메커니즘 필요(빌드·런타임 양쪽) |

**결정 (1차 출시): 옵션 (A)**.

- **근거 1**: 본 앱은 사용자 작성 마크다운 파일만 처리. 외부 네트워크 입력(폼 제출, URL 파라미터 등) 표면이 없어 unsafe-inline의 실질 위험은 markdown 콘텐츠 한정.
- **근거 2**: markdown-it `html: false` (결정 14) + DOMPurify의 `style` 속성 strip이 1차 방어선으로 작동. 사용자 마크다운에서 `<div style="...">`이 들어와도 차단.
- **근거 3**: shiki 인라인 스타일을 nonce로 묶는 작업은 사이클 6에서 별도 비용(추정 1~2일). 1차 출시 일정 보호 우선.

**Phase 2 강화 계획**: 옵션 (B) — shiki nonce화. Phase 2 진입 시 별도 사이클로 분리. 결정 게이트 통과 후 첫 보안 강화 항목.

**이중방어**:

- CSP는 `index.html`의 `<meta http-equiv="Content-Security-Policy">`로 1차 적용.
- **`session.defaultSession.webRequest.onHeadersReceived`로 응답 헤더에도 동일 CSP 적용**(이중방어). custom protocol 응답에 CSP 헤더가 누락되는 사례를 차단.

**사이클 7 spec 의무 항목**:

- DOMPurify 설정에 `FORBID_ATTR: ['style']` 또는 동등 효과 옵션 명시.
- 마크다운 인라인 HTML이 활성화될 때(`html: true`로 변경 시) DOMPurify가 즉시 적용되는지 검증.

#### 4.4.2 로컬 자산 접근 정책 (P2-7 반영)

로컬 이미지·첨부를 `mddolphin-asset://` custom protocol로 노출할 때, **현재 문서의 base directory 화이트리스트** 외부 경로는 거부한다.

**정책**:

1. **base directory**: 현재 윈도우가 보유한 `MarkdownDocument.url`의 디렉토리. 윈도우 단위로 보유.
2. **요청 검증**: protocol 핸들러에서 요청된 파일 경로를 `path.resolve`로 정규화한 뒤,
   - `path.relative(baseDir, requestedPath)` 결과가 `..`로 시작하면 **거부**.
   - 절대 경로가 baseDir 외부면 **거부**.
3. **symlink 정책**: `fs.realpath`로 해석한 결과가 baseDir 외부면 **거부**(symlink 경유 traversal 차단).
4. **확장자 화이트리스트**: 이미지(`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`)만 1차 허용. 그 외는 거부. SVG는 향후 XSS 우려로 추가 sanitize 검토.

**사이클 spec 의무 항목**:

- **사이클 3 spec**: "현재 문서의 base directory를 윈도우 단위로 보유" — `DocumentWindow` 또는 동등 객체에 `baseDir: string` 필드.
- **사이클 7 spec**: protocol 핸들러 등록 시 `baseDir` 인자 받아 위 검증 로직 적용. 단위 테스트로 traversal 케이스 회귀.

### 4.5 상태 관리 — Zustand (이전 SwiftUI Observation의 대응)

| 상태                       | 패턴                                  | 범위                                      | 비고                                                                                       |
| -------------------------- | ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| **`RenderingTheme`**       | Zustand 스토어 + ThemeProvider        | **앱 전역 단일 인스턴스**                 | `nativeTheme.themeSource` 변경 시 자동 업데이트. CSS 변수로 DOM에 반영.                    |
| **`MarkdownDocument`**     | 윈도우 단위 Zustand 스토어            | **윈도우 단위 보유** (BrowserWindow 단위) | 다중 윈도우(Phase 2) 도입 시 윈도우별 상태 격리가 깨지지 않도록 MVP에서 미리 격리.         |
| **`AppSettings`**          | Zustand 스토어 + electron-store(영속) | 앱 전역                                   | 사용자 설정(zoom, 테마 override) 영속화. main process에서 보유 후 IPC로 renderer에 동기화. |
| 임시 UI 상태 (스크롤·확대) | `useState` (React)                    | 컴포넌트 로컬                             | 평범한 React 패턴.                                                                         |

**대안 검토**:

- **Jotai**: 원자(atom) 기반, 간결. Zustand보다 더 미세한 단위. 본 프로젝트는 단일 페이지에 가까워 Zustand의 단순함이 적합.
- **React Context만**: 가능하지만 리렌더 최적화 부담. Zustand는 selector로 자동 최적화.
- **Redux Toolkit**: 오버엔지니어링.

**다중 윈도우 격리 원칙 (Phase 2 대비)**:

- `MarkdownDocument` 스토어는 **반드시 BrowserWindow 단위**. 전역 싱글턴 안티패턴 금지.
- MVP는 단일 윈도우이지만, 윈도우 진입점에서 스토어를 생성·소유하는 패턴으로 설계해 Phase 2 다중 윈도우 도입 시 코드 변경 최소화.
- `RenderingTheme`은 앱 전역이지만 윈도우별 override(예: 한 윈도우만 다크 강제)가 Phase 2 후보.

### 4.6 데이터 모델 개요 — 라이브러리 락인 제거

```typescript
// 개념적 표현 (실제 코드는 spec-writer가 작성)

interface MarkdownDocument {
  url: string; // file:// URL 또는 절대 경로
  rawText: string;
  outline: Outline; // TOC용 헤딩 트리 (도메인 타입)
  headings: Heading[]; // 섹션 점프용 (도메인 타입)
  // ※ markdown-it 토큰 같은 라이브러리 종속 타입은 노출하지 않음
  // ※ 토큰은 MarkdownRenderer 내부에서만 보유
}

interface DocumentWindow {
  documentId: string;
  baseDir: string; // 4.4.2 로컬 자산 화이트리스트 기준
  document: MarkdownDocument;
}

interface Outline {
  root: OutlineNode[];
}

interface OutlineNode {
  heading: Heading;
  children: OutlineNode[];
}

interface Heading {
  level: number; // 1~6
  text: string;
  anchor: string; // 스크롤 점프용 ID
  offset: number; // rawText 내 시작 위치 (문자 인덱스 — markdown-it map 의존 X, 어댑터로 변환됨)
}

interface RenderingTheme {
  mode: "light" | "dark" | "auto";
  bodyFontFamily: string;
  codeFontFamily: string;
  bodyWidth: number; // px
  lineHeight: number;
  colors: ThemeColors;
}

interface AppSettings {
  defaultZoom: number;
  themeOverride: "light" | "dark" | "auto";
  showOutline: boolean;
}
```

**잠금 위험 제거**:

- 도메인 모델은 markdown-it / shiki / sanitize-html 어느 것에도 의존하지 않음.
- 향후 파서 라이브러리 전환 시(예: remark) 변환 어댑터 한 곳만 변경. 자세한 비용은 4.2.2 참조.
- 헤딩 추출도 markdown-it 토큰에서 도메인 타입으로 정규화한 결과만 외부 노출.

### 4.7 빌드 도구 결정

| 영역              | 선택                                     | 이유                                                                                           |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 패키저            | **electron-builder** (결정 11)           | dmg 생성·서명·공증 자동화 표준. `--mac dmg --universal` 한 줄. (Forge도 가능하나 Builder 우세) |
| 개발 서버         | **Vite 5+**                              | HMR 빠름, ESM 네이티브. `vite-plugin-electron` 활용                                            |
| 패키지 매니저     | **pnpm 9+**                              | 빠르고 디스크 효율적. monorepo 확장 가능. (npm/yarn 대비 사용자 선호 따름)                     |
| Node 버전         | **Node.js 20 LTS**                       | Electron 35의 번들 Node와 호환                                                                 |
| TypeScript        | **TypeScript 5.4+**                      | strict mode 의무. `tsc --noEmit`로 타입 체크.                                                  |
| 린트/포매터       | ESLint + Prettier                        | 표준 조합                                                                                      |
| 테스트            | **Vitest** (단위) + **Playwright** (E2E) | Vite 친화적, 빠름. Playwright는 Electron 자동화 공식 지원                                      |
| 렌더러 프레임워크 | **React 18** (결정 10)                   | 생태계 풍부, Zustand·i18next·Playwright 친화. (대안 검토는 4.7.1 참조)                         |

#### 4.7.1 렌더러 프레임워크 선택 (사용자 결정 게이트)

| 옵션      | 장점                                               | 단점                                     | 적합도                |
| --------- | -------------------------------------------------- | ---------------------------------------- | --------------------- |
| **React** | 생태계 최대, 학습 자료 많음, Claude Code 지원 강함 | 번들 약간 큼, 보일러플레이트             | **1차 권장 (기본값)** |
| Vue 3     | 템플릿 친숙, 작은 번들                             | 생태계 React 대비 작음                   | 2차 후보              |
| Svelte    | 번들 매우 작음, 컴파일 타임 최적화                 | 생태계 작음, Zustand 같은 표준 도구 없음 | 3차 후보              |
| Vanilla   | 최소 의존성                                        | 컴포넌트화 부담, 상태관리 직접 구현      | 적합 안 함            |

**1차 권장: React** — 본 프로젝트가 단일 페이지에 가깝지만 사이드바·메뉴·다이얼로그 등 컴포넌트 단위 분할이 명확하고, Claude Code의 React 지원이 가장 강함. **사용자가 Vue/Svelte 명시 선호 시 사이클 1 시작 전 변경 가능.** 미명시 시 React로 자동 진행(0.2 G2, `05-changelog.md`).

**변경 트리거**: 사용자가 Vue/Svelte 학습·생태계 측면에서 명백히 선호한다고 명시할 때.

#### 4.7.2 빌드 도구 비교 — Electron Builder vs Forge

| 항목                | electron-builder                          | Electron Forge                             |
| ------------------- | ----------------------------------------- | ------------------------------------------ |
| dmg 생성            | 표준 (`mac.target: dmg`)                  | `@electron-forge/maker-dmg`                |
| 코드 서명·공증      | `afterSign` 훅 + notarize 플러그인 표준   | `@electron-forge/plugin-osx-sign-notarize` |
| Universal Binary    | `mac.target: dmg, arch: ['x64', 'arm64']` | `arch: 'universal'` 옵션                   |
| 자동 업데이트       | `electron-updater` 통합                   | Squirrel.Mac 통합                          |
| 사용자 베이스       | 더 큼, 문서 풍부                          | Electron 공식                              |
| GitHub Actions 친화 | YAML 짧음 (`run: pnpm dist`)              | YAML 짧음                                  |

**1차 권장 (확정): electron-builder** — DMG 배포가 핵심이라 Builder의 표준화된 설정이 유리. 결정 11에 의해 자동 진행.

**변경 트리거**: 사이클 11a에서 electron-builder의 universal binary 빌드가 30분을 초과하거나, 노타라이즈 통합에서 표준 설정으로 해결되지 않는 회귀가 발생할 때.

#### 4.7.3 성능 벤치 표준 (P2-3 반영)

성공 지표(콜드 스타트 1.5초, 메모리 500MB, 1만 줄 1초)의 측정·합격 판정 기준을 표준화한다. 사이클 9 성능 검증은 본 표준을 따른다.

**측정 환경**:

| 항목     | 표준                                                        |
| -------- | ----------------------------------------------------------- |
| 1차 환경 | **Apple Silicon MacBook Air M1/M2 16GB RAM, macOS 12 이상** |
| 2차 환경 | (선택) Intel MacBook x64 16GB — Universal Binary 검증용     |
| OS 상태  | 측정 직전 재부팅 후 백그라운드 앱 최소화                    |
| 전원     | 충전 중 / 고성능 모드                                       |

**측정 도구**:

| 지표          | 도구·API                                                                                                | 합격 판정                      |
| ------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 콜드 스타트   | `app.whenReady()` ~ `BrowserWindow.webContents.did-finish-load`까지 `performance.now()`                 | **p50 1.5초 / p95 2.5초 이내** |
| 1만 줄 렌더링 | renderer 측 `performance.mark/measure` (markdown 적용 시작 ~ React commit 완료)                         | **p50 1초 / p95 2초 이내**     |
| 메모리 사용량 | `app.getAppMetrics()`의 `memory.workingSetSize` (main + renderer 합산) + Activity Monitor RSS 교차 검증 | **p50 500MB 이내**             |
| 번들 크기     | DMG 파일 크기 (`stat -f %z`)                                                                            | **130MB 이내**                 |

**측정 표준화**:

- 측정 시도 횟수: **각 지표 5회 반복**, p50/p95 산출.
- 1만 줄 fixture: `tests/fixtures/large-10k.md` — **사이클 2부터 표준 fixture로 정착**(P2-5). 사이클 5/6/7에서 동일 파일로 회귀.
- 회귀 게이트(사이클 5/6/7): **각 사이클 종료 시 1만 줄 회귀 시간 ≤ 5초** (가상 스크롤 미도입 단계의 너그러운 임계). 5초 초과 시 사이클 9 가상 스크롤 도입을 앞당겨 조기 사이클로 분리.

**정성 인터뷰 항목 추가** (성공 지표 정성 항목과 연동):

- "**열리고 첫 화면이 뜨기까지 답답함을 느꼈는가?**" — 비개발자 인터뷰 5명 1차, 답답함 응답 30% 미만이 합격.
- "1만 줄 문서를 스크롤할 때 끊김을 느꼈는가?" — 사이클 9 종료 후 인터뷰.
