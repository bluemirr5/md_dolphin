# md_dolphin 마스터 플랜

**상태**: Approved (스택 전환 결정 + CLI-only 워크플로 반영 + P2 라운드 반영)
**작성일**: 2026-04-29
**최종 갱신**: 2026-04-29 (architect P2 라운드 반영 — 진입 게이트·CSP·성능 벤치 표준 추가)

---

## 0. 확정 사항 (사용자 결정)

본 섹션은 사용자 검토를 거쳐 **확정된 핵심 의사결정**을 명시한다. 아래 결정은 마스터 플랜 전체의 전제로 작용하며, 변경 시 영향받는 사이클을 재점검한다.

| #   | 결정 항목                       | 확정 내용                                                                                                                                                             | 영향                                                                                                                               |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **스택 전환 (NEW)**             | **SwiftUI 네이티브 → Electron + TypeScript + React + Vite**. 사유: 사용자가 **터미널·셸·vim·Claude Code 기반 워크플로**를 강하게 선호. Xcode IDE를 한 번도 열지 않음. | 모든 빌드/패키징/서명/배포가 CLI에서 완결되어야 함. macOS 네이티브 통합 일부 포기(특히 Quick Look). 번들·메모리 트레이드오프 발생. |
| 2   | **수익 모델**                   | **무료 OSS** (유지)                                                                                                                                                   | 운영 비용·라이선싱·마케팅 톤 결정. 분석 SDK 없음 일관성 강화.                                                                      |
| 3   | **출시명**                      | **`md_dolphin`** 유지 (출시 직전 재검토)                                                                                                                              | 도메인·아이콘·릴리스 자료에 코드명 그대로 반영.                                                                                    |
| 4   | **타깃 OS (Phase 1)**           | **macOS 전용**. **Windows/Linux는 Non-Goal이지만 코드 친화 유지(A안 채택)**. 자세한 가이드는 0.3 참조.                                                                | electron-builder `--mac dmg` 단일 타깃. macOS 외 빌드 산출물 미생성. 코드 분기는 macOS 전제로 진행하되 OS-specific 호출 격리.      |
| 5   | **macOS 최소 버전**             | **macOS 12 Monterey 이상** (Electron 35+ 요구 사항)                                                                                                                   | SwiftUI 14 Sonoma 제약에서 해방. macOS 12·13·14·15 사용자 모두 커버.                                                               |
| 6   | **배포 전략 (Phase 1)**         | **미서명 DMG (GitHub Releases) + Homebrew Cask 보조**                                                                                                                 | Apple Developer Program $99/년 **가입하지 않음**. Gatekeeper 우회 안내 필수. Phase 2 노타라이즈 전환 결정 게이트 유지.             |
| 7   | **언어/UI**                     | **한국어 + 영어** (i18next 기반)                                                                                                                                      | 그 외 언어는 Non-Goal.                                                                                                             |
| 8   | **타이포그래피**                | 본문 폭 680px, 행간 1.7, Apple SD Gothic Neo + Pretendard fallback, Light/Dark 시스템 추종                                                                            | 디자인 토큰을 CSS 변수로 통일.                                                                                                     |
| 9   | **빌드/배포 워크플로**          | **CLI-only**. Xcode IDE 비사용. Xcode Command Line Tools(`codesign`, `xcrun`)는 백그라운드 사용 허용.                                                                 | 사이클 1부터 모든 작업이 셸 명령으로 재현 가능하도록 설계.                                                                         |
| 10  | **렌더러 프레임워크 (NEW)**     | **React 18** (1차 권장 기본값). Vue/Svelte는 0.2 진입 게이트에 따라 사용자 명시 변경 시에만.                                                                          | 사이클 1 부트스트랩에 React 직진. 사이클 1 종료 후 전환은 비용 큼.                                                                 |
| 11  | **빌드 도구 (NEW)**             | **electron-builder** (DMG + Universal Binary 가장 검증).                                                                                                              | 사이클 1·11a에서 표준 설정으로 직진.                                                                                               |
| 12  | **번들 크기 마케팅 표기 (NEW)** | **솔직 표기**. "약 130MB 다운로드 / Apple Silicon Mac에서 약 200MB 메모리 사용".                                                                                      | README·릴리스 노트·다운로드 페이지에 동일 문구. 비개발자 신뢰 확보 우선.                                                           |
| 13  | **CSP `style-src` 정책 (NEW)**  | **옵션 (A) `'unsafe-inline'` 유지 + DOMPurify에서 style 속성 strip + shiki 인라인 스타일은 Phase 2에서 nonce 검토**. 자세한 근거는 4.4.1 참조.                        | 사이클 7에서 DOMPurify 설정에 style 속성 strip 의무. shiki nonce 작업은 Phase 2 게이트 통과 후 별도 사이클.                        |
| 14  | **마크다운 인라인 HTML (NEW)**  | **`html: false` 시작** (가장 안전). 사용자 요구 발생 시 allowlist 확장 (details/summary/sub/sup/kbd/mark 후보).                                                       | 사이클 5 spec에서 markdown-it 옵션 명시. allowlist 확장은 사이클 7 또는 Phase 2 결정.                                              |

### 0.1 리뷰 반영 이력

| 일자           | 리뷰어        | 항목                                                 | 반영 결과                                                                                                                                            |
| -------------- | ------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29     | architect     | **P0-1 사이클 분할 순서 재배치** (이전 SwiftUI)      | (이전 결정, Electron 전환 후에도 원칙 유지: 렌더러 사이클이 파일 열기 사이클 이후에 진행되지 않도록 인터페이스를 도메인 모델로 못박음.)              |
| 2026-04-29     | architect     | **P1-1 상태 관리 패턴 명시** (이전 SwiftUI)          | Electron 전환 후: React + Zustand로 대체. 윈도우 단위 격리 원칙 유지.                                                                                |
| 2026-04-29     | architect     | **P1-2 ParserAdapter 추상화 재설계** (이전)          | Electron 전환 후: markdown-it(파싱) + 자체 React 렌더러 분리. AST는 도메인 모델 외부에 노출하지 않음.                                                |
| 2026-04-29     | architect     | **P1-3 에러·접근성·i18n 사이클** (이전)              | Electron 전환 후에도 동일 사이클 유지. 접근성은 웹 a11y(ARIA, Dynamic Type 대응 = `prefers-reduced-motion`/`em` 기반 폰트 스케일) 기준으로 변환.     |
| 2026-04-29     | architect     | **P1-4 사이클 11(배포) 분할** (이전)                 | 11a/11b 분할 유지. 도구만 `create-dmg` → `electron-builder`로 변경.                                                                                  |
| 2026-04-29     | architect     | **P1-5 데이터 모델 라이브러리 락인 제거** (이전)     | 동일 원칙 유지. Swift 타입 → TypeScript 인터페이스로 변환.                                                                                           |
| **2026-04-29** | **user**      | **스택 전환 (SwiftUI → Electron)** **(NEW)**         | 사용자 결정: 터미널 워크플로 유지를 위해 Electron 채택. 본 마스터 플랜 전면 재작성. 이전 SwiftUI 결정은 폐기.                                        |
| 2026-04-29     | planner       | **자체 검증** (1라운드)                              | "Electron 전환 + CLI-only 워크플로 검증 완료" 마킹.                                                                                                  |
| **2026-04-29** | **architect** | **P2-1 사이클 1 진입 게이트 정의** (NEW)             | 6개 결정 항목을 0.2 진입 게이트 표로 신설. **사용자 결정 필수: 1건(Tauri B안 재검토)**, 나머지 5건은 합리적 기본값으로 자동 진행.                    |
| **2026-04-29** | **architect** | **P2-2 CSP `style-src` 결정 근거** (NEW)             | 4.4.1 단락 신설. 옵션 (A) unsafe-inline + DOMPurify style strip 채택. shiki nonce는 Phase 2 강화. 이중방어 webRequest 헤더 옵션 명시.                |
| **2026-04-29** | **architect** | **P2-3 성능 벤치 표준** (NEW)                        | 4.7.3 신설. 환경(M1/M2 16GB), 측정 도구(performance.now/getProcessMemoryInfo), p50/p95 합격 판정. 1만 줄 fixture 표준화. 정성 인터뷰 항목 추가.      |
| **2026-04-29** | **architect** | **P2-4 사이클 1 산출물 분리** (NEW)                  | 6.2에 "필수(사이클 1 종료 조건)" vs "완비(사이클 2 시작 시)" 구분 추가. `pnpm dist`는 사이클 11a 직전까지 미룰 수 있도록 표기.                       |
| **2026-04-29** | **architect** | **P2-5 가상 스크롤 대비** (NEW)                      | 사이클 2 spec 의무: "렌더러 인터페이스를 가상화 친화 청크/슬라이스로 표현". 사이클 5/6/7에 1만 줄 회귀 게이트 추가. 사이클 9 가속 룰 명시.           |
| **2026-04-29** | **architect** | **P2-6 파서 전환 비용** (NEW)                        | 4.2에 "파서 전환 비용 가정" 단락 신설. Mermaid 단독 vs Mermaid+KaTeX 의사결정 룰 명시. Heading.offset이 markdown-it map 의존이 아니도록 어댑터 검증. |
| **2026-04-29** | **architect** | **P2-7 로컬 자산 접근 정책** (NEW)                   | 4.4.2 단락 신설. base directory 화이트리스트, path.relative `..` 거부, symlink 정책. 사이클 3·7 spec 의무 항목으로 흡수.                             |
| **2026-04-29** | **architect** | **P2-8 HTML 인라인 정책** (NEW)                      | 결정 14 신설(`html: false` 시작). 사이클 5 spec에서 검증.                                                                                            |
| **2026-04-29** | **architect** | **P2-9 크로스플랫폼 친화 가이드** (NEW)              | 0.3 단락 신설. macOS 분기 격리 규칙 + 빌드 설정 단일화. 사이클 spec 의무 항목 "macOS 분기 정책 영향"에 흡수.                                         |
| **2026-04-29** | **architect** | **P2-10 Universal Binary CI 비용** (NEW)             | 사이클 11a 산출물에 빌드 시간 측정(목표 30분) + 초과 시 arm64 우선 릴리스 전략 추가.                                                                 |
| **2026-04-29** | **architect** | **P2-11 Homebrew Cask livecheck/auto_updates** (NEW) | 사이클 11b 체크리스트에 Phase 1: `auto_updates: false`, `livecheck` GitHub Releases / Phase 2: `auto_updates: true` 변경 명시.                       |
| **2026-04-29** | **architect** | **P2-12 Phase 2 진입 첫 사이클 시점** (NEW)          | 0.4 단락 신설. 노타라이즈 게이트 통과 후 가입→CSR→인증서→afterSign→첫 노타라이즈 빌드까지 5~7일 사이클 묶음 사전 정의.                               |
| 2026-04-29     | planner       | **자체 검증** (P2 라운드)                            | "P2 라운드 반영 완료" 마킹. CTO 관점에 P2 흡수 결과 추가.                                                                                            |

### 0.2 사이클 1 진입 게이트 (P2-1 반영)

사이클 1 부트스트랩을 spec-writer에 의뢰하기 전, 아래 6건의 결정이 모두 명시 상태에 있어야 한다. **결정 형식**은 본 마스터 플랜에 반영(자동 진행) 또는 별도 결정 문서(`docs/plans/decisions/<YYYY-MM-DD>-<주제>.md`) 작성으로 통일한다.

| #   | 결정 항목                        | 결정 마감일        | 결정 주체 | 결정 형식                      | 미결정 시 기본값                                               | 게이트 차단 여부              |
| --- | -------------------------------- | ------------------ | --------- | ------------------------------ | -------------------------------------------------------------- | ----------------------------- |
| G1  | **Tauri B안 재검토 여부**        | 사이클 1 시작 전   | 사용자    | 사용자 응답(A안 유지 또는 B안) | **A안(Electron) 그대로 진행**. 사용자 명시 요청 시에만 재검토. | **차단 (사용자 결정 필수)**   |
| G2  | **렌더러 프레임워크**            | 사이클 1 시작 전   | 사용자    | 본 플랜 결정 10                | **React 18** (기본값으로 자동 진행)                            | 비차단 (기본값으로 의뢰 가능) |
| G3  | **macOS 최소 버전**              | (확정 완료)        | -         | 본 플랜 결정 5                 | **macOS 12 Monterey** (확정)                                   | 비차단 (확정)                 |
| G4  | **빌드 도구**                    | 사이클 1 시작 전   | -         | 본 플랜 결정 11                | **electron-builder** (기본값)                                  | 비차단                        |
| G5  | **번들 크기 표기 정책**          | 사이클 11b 시작 전 | -         | 본 플랜 결정 12                | **솔직 표기** (130MB / 200MB 명시)                             | 비차단                        |
| G6  | **macOS 전용 + 코드 친화 (A안)** | (확정 완료)        | -         | 본 플랜 결정 4 + 0.3           | **A안 유지** (Phase 1 macOS only, 코드는 OS-specific 격리)     | 비차단 (확정)                 |

**진입 절차**:

1. G1만 사용자 응답을 받는다. "A안 유지"가 명시되면 모든 게이트 통과.
2. G2~G5는 기본값으로 자동 진행. 사용자가 다른 선택을 명시할 경우에만 본 플랜의 결정 표를 갱신한다.
3. G3·G6은 이미 확정 — 별도 응답 불필요.
4. **Tauri B안 재검토는 사이클 1 종료 시점에 사용자가 명시 요청할 때에만** 재개. 그 외 시점에 다시 꺼내지 않는다(의사결정 비용 차단).

### 0.3 크로스플랫폼 친화 가이드 (P2-9 반영, A안)

"Phase 1 macOS only + 코드 친화"의 의미를 사이클 단위 의사결정 비용 없이 일관 적용하기 위한 단순 규칙:

- **빌드 타깃은 macOS 단일**. electron-builder의 `mac.target`만 설정하고, `win.*` / `linux.*` 설정은 추가하지 않는다(Phase 1 한정).
- **OS-specific Node API 호출은 `process.platform === 'darwin'` 분기로 격리**. 예: `app.dock`, `app.on('open-file')`, `app.setAccessibilitySupportEnabled()` 등.
- **단축키 표기는 `Cmd` 직표기 허용** — 사용자 노출 문자열에 `Ctrl/Cmd` 같은 OS 분기 텍스트를 강제하지 않는다.
- **파일 경로 처리는 항상 `path.posix` 또는 `path` 모듈 사용**. 수동 문자열 결합 금지(향후 Win 호환 가능성 보존).
- **테스트는 macOS에서만 돌리며**, Win/Linux 호환은 검증하지 않는다(Non-Goal).
- **사이클 spec 의무 기재 항목**에 "macOS 분기 정책 영향" 한 줄 추가(6.7 참조).

### 0.4 Phase 2 진입 첫 사이클 시점 (P2-12 반영)

노타라이즈 결정 게이트(섹션 0의 결정 6 / 1.0의 결정 게이트) 통과 시 즉시 진입할 작업을 5~7일 묶음 사이클로 사전 정의한다. 사이클 11b 종료 이후 발생할 수 있는 첫 Phase 2 사이클을 다음과 같이 명시:

**Phase 2 진입 사이클 (가칭 `사이클 P2-1: 노타라이즈 파이프라인`)**

| 단계 | 작업                                                                                   | 예상 소요 |
| ---- | -------------------------------------------------------------------------------------- | --------- |
| 1    | Apple Developer Program 가입 + 결제                                                    | 1일       |
| 2    | CSR 생성 + Developer ID Application 인증서 발급                                        | 0.5일     |
| 3    | electron-builder `mac.identity` 설정 + 키체인 통합                                     | 0.5일     |
| 4    | `afterSign` 훅에 노타라이즈 스크립트 통합 (`@electron/notarize` 또는 `notarytool`)     | 1일       |
| 5    | 첫 노타라이즈 빌드 + Apple 응답 검증                                                   | 1일       |
| 6    | README·다운로드 페이지에서 Gatekeeper 우회 안내 → "더블클릭으로 바로 실행" 문구로 갱신 | 0.5일     |
| 7    | `electron-updater` 도입 (별도 사이클 분리 가능)                                        | 1~2일     |

**총 예상**: 5~7일. 게이트 통과 시점에 본 사이클을 spec-writer에 의뢰하면 사이클 P2-1 spec이 작성된다.

### 결정 1의 트레이드오프 (스택 전환) — 솔직한 명시

**선택**: SwiftUI 네이티브 폐기 → Electron + TypeScript + React + Vite.

**얻는 것**:

- **터미널 완결 워크플로** — `npm run dev`, `npm run build`, `npm run dist`로 모든 작업 가능. Xcode IDE를 한 번도 열지 않음.
- vim/Claude Code 등 셸 기반 도구 친화 — 사용자 작업 흐름 자체가 일관됨.
- **마크다운 라이브러리 생태계의 풍부함** — markdown-it, remark, shiki 등 검증된 도구를 즉시 활용 가능.
- macOS 최소 버전 완화 — 12 Monterey 이상으로 커버 범위 확장.
- 향후 Windows/Linux 확장 가능성 보존(현재는 Non-Goal이지만 기술적으로 열려 있음).

**포기하는 것·리스크**:

- **번들 크기 증가** — Electron은 Chromium + Node.js를 포함해 압축 후에도 100~150MB 수준. 비개발자 사용자에게 "무거운 앱" 인상을 줄 수 있음. 이는 본 프로젝트의 1차 가치 제안("위협감 없는 뷰어")과 부분 충돌.
- **메모리 사용량** — 시작 시 RAM 200~300MB 수준. SwiftUI 네이티브의 30~50MB 대비 5배 이상.
- **콜드 스타트 지연** — 흰 화면 깜빡임(white flash)이 Electron 특유. 시작 화면(splash) 또는 배경 색상 사전 적용으로 완화 필요.
- **Quick Look 확장 사실상 불가** — Electron으로 macOS Quick Look 플러그인을 만드는 것은 비현실적. 이전 플랜의 Phase 2 후보였던 Quick Look은 **Phase 3+ 또는 Drop**으로 이전.
- **macOS 통합 감성 부족** — 시스템 폰트·다크모드·메뉴는 흉내 가능하지만 네이티브 대비 미묘한 차이 존재. CSS·`nativeTheme` API로 최선을 다해 보정.
- **보안 표면 확대** — Renderer 프로세스, IPC, contextIsolation, sanitize 등 Electron 특유 보안 패턴 필요.

**완화 방안**:

- **번들 압축**: `asar` 압축 + electron-builder의 `compression: maximum` 옵션. ICU 데이터 등 불필요 리소스 제거.
- **시작 화면**: 메인 윈도우 생성 시 `backgroundColor`를 라이트/다크 사전 결정해 흰 화면 깜빡임 방지. 시작 시 작은 로딩 인디케이터.
- **번들 크기 정직히 표기**: 다운로드 페이지에 "약 130MB / 메모리 약 200MB"를 명시. 비개발자에게 숨기지 않음(결정 12).
- **메모리 모니터링**: 사이클 9 성능 검증 시 RAM 측정 의무화. 1만 줄 .md 파일에서 500MB 미만 목표.
- **macOS 통합 보강**: `nativeTheme`로 다크모드 자동 추종, macOS 표준 메뉴 템플릿 활용, 시스템 폰트(`-apple-system`) 우선 사용.

### Tauri 옵션 (B안 — 사용자가 명시 요청 시에만 재개)

사용자가 번들 크기·성능에 더 민감하다면 Tauri(Rust + WebView) 옵션도 고려할 수 있다. 본 플랜은 **Electron을 1차 채택(A안)** 으로 진행하며, **B안 재검토는 사이클 1 종료 시점에 사용자가 명시 요청할 때에만 재개**한다(P2-1 반영).

| 항목                  | A안: Electron                      | B안: Tauri                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------ |
| 번들 크기             | 100~150MB                          | **5~15MB** (시스템 WebView 사용)                       |
| 메모리                | 200~300MB                          | **50~100MB**                                           |
| 시작 시간             | 1~2초                              | **0.5초 이내**                                         |
| 런타임 언어           | TypeScript (Node.js)               | **Rust** (백엔드) + JS (프론트엔드)                    |
| macOS WebView         | Chromium 번들                      | **WKWebView** (시스템) — 폰트·렌더링 macOS 네이티브 톤 |
| 마크다운 라이브러리   | npm 생태계 (markdown-it 등)        | npm 생태계 동일 사용 가능                              |
| 한국어 폰트 렌더링    | Chromium 일관 (어떤 OS에서도 동일) | WKWebView (Safari 동일) — macOS 네이티브 한글 조판     |
| 빌드 도구             | electron-builder / forge           | `cargo tauri build` (CLI-only)                         |
| 학습 곡선             | 낮음 (JS만)                        | **중상** (Rust 백엔드 필수)                            |
| 생태계 성숙도         | 매우 성숙                          | 성숙도 상승 중 (1.x stable, 2.0 안정화 단계)           |
| 코드 서명·공증 자동화 | electron-builder가 표준 지원       | `cargo tauri build`에 통합                             |

**1차 권장: A안 (Electron)** — 사용자가 Rust 학습 곡선을 새로 짊어지는 것은 "터미널 친화 워크플로 유지"라는 본래 동기와 일치하지 않을 수 있음. JS/TS 단일 언어로 main/renderer 모두 작성 가능한 Electron이 사이클 진행 부담이 가장 낮다.

**B안 채택 시점 (재정의, P2-1)**: 사이클 1 종료 직후 사용자가 명시 요청할 때에만. 그 외 시점에는 의사결정 비용을 차단하기 위해 본 옵션을 다시 꺼내지 않는다.

### 노타라이즈 전환 결정 게이트 (Phase 2 진입 트리거)

다음 시그널 중 **2개 이상** 관측 시 Apple Developer Program 가입 + 노타라이즈 DMG 전환을 즉시 결정한다. (이전 플랜의 게이트 그대로 유지)

| #   | 시그널                                   | 관측 방법                                       | 임계치                                       |
| --- | ---------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| 1   | **Gatekeeper 우회 실패율 높음**          | GitHub Issues에 "열리지 않음" 류 빈도           | 출시 후 4주 내 5건 이상                      |
| 2   | **다운로드 대비 실사용 전환율 저조**     | Releases 다운로드 vs Stars / Issues / 인터뷰    | 다운로드 200+이지만 활성 피드백 10건 미만    |
| 3   | **비개발자 사용자 인터뷰에서 설치 좌절** | 인터뷰 대상자(5~10명) 중 "포기" 응답            | 30% 이상                                     |
| 4   | **Homebrew Cask 의존 비율 과다**         | 채널 분포 (Releases vs Homebrew)                | Homebrew 비중 70%+ → 비개발자 도달 실패 신호 |
| 5   | **macOS 정책 변화**                      | 향후 macOS 버전이 미서명 앱 실행을 더 어렵게 함 | 1개라도 발생 시 즉시 전환 검토               |

게이트 통과 시: 가입 → Developer ID 인증서 → `electron-builder` 노타라이즈 자동화(`afterSign` 훅) → 다음 패치 릴리스 적용. 첫 사이클 묶음은 0.4 참조. Mac App Store는 Phase 3 이후 별도 검토.

---

## 1. 프로젝트 개요

### 한 문장 정의

**비개발자**가 개발자들이 작성한 마크다운 문서를 **위협감 없이 편하게 읽을 수 있도록**, 가독성과 타이포그래피 품질을 극대화한 **macOS 마크다운 뷰어** (Electron 기반).

### 배경

마크다운(.md)은 개발자 커뮤니티의 사실상 표준 문서 포맷이다. README, 릴리스 노트, 사내 위키, 정책 문서가 점점 더 마크다운으로 작성되고 있다. 그러나:

- macOS 기본 TextEdit/Quick Look은 마크다운을 **렌더링하지 않고 원시 텍스트** 그대로 보여준다.
- 기존 마크다운 도구(Typora, Obsidian, MacDown, VS Code)는 대부분 **편집 기능 중심**이고 **개발자 미감**이 강해 비개발자에게 위화감을 준다.

이 프로젝트는 "**책처럼 읽히는 마크다운 뷰어**"를 목표로, 비개발자가 사내 문서·릴리스 노트를 잘 편집된 아티클처럼 읽도록 만든다. 기술 스택은 사용자의 **CLI-only 워크플로 선호**에 맞춰 Electron + TypeScript + React + Vite로 구성한다.

### 성공 지표

**정량 지표 (출시 후 3개월 기준)**

- GitHub Releases + Homebrew Cask 합산 **누적 다운로드 1,000건**
- **GitHub Stars 200+**
- 사용자 1인당 평균 **10개 이상의 .md 파일** 열람 (인터뷰 자체 보고 기반)
- **충돌율(crash rate) 1% 미만** (Sentry 또는 자체 로컬 로깅 — 외부 전송 없음)
- **콜드 스타트 1.5초 이내** (Apple Silicon 기준 — Electron 현실적 수치로 재설정, 이전 SwiftUI 300ms 목표는 폐기). 측정 기준은 4.7.3 성능 벤치 표준 참조.
- **1만 줄 .md 파일 렌더링 1초 이내** (가상 스크롤 도입 후 기준)
- **메모리 사용량 500MB 미만** (1만 줄 파일 열람 시)

**정성 지표**

- 비개발자 사용자 인터뷰에서 "**기술 문서 같지 않다**" 또는 "**읽기 편하다**" 응답 **70% 이상** (인터뷰 대상자 5~10명, 출시 후 4주 내 1차 측정)
- 개발자 사용자 인터뷰에서 "**비개발자 동료에게 README를 공유할 때 추천할 수 있다**" 응답 **60% 이상**
- 비개발자 인터뷰에서 "**설치 과정에서 포기하지 않았다**" 응답 **70% 이상**
- 비개발자 인터뷰에서 "**번들 크기(~130MB)가 거슬렸다**" 응답 **30% 미만** (Electron 트레이드오프 검증 지표 / 샘플 크기: 1차 5명, 게이트 시그널 발생 시 30명 추가 인터뷰)
- **(P2-3 신규)** 비개발자 인터뷰에서 "**열리고 첫 화면이 뜨기까지 답답했다**" 응답 **30% 미만** (콜드 스타트 정성 지표)

---

## 2. 범위와 페이즈

### MVP (Phase 1) — "그냥 잘 읽힌다"

- **파일 열기**: Finder 더블클릭, 드래그앤드롭, ⌘O
- **CommonMark + GFM 렌더링**: 표, 체크박스, 코드 블록, 자동 링크, 취소선
- **타이포그래피 우선 디자인**: 본문 폭 제한(680px), 충분한 행간(1.7), 한국어 폰트 fallback
- **라이트/다크 모드**: macOS 시스템 외관 자동 추종 (`nativeTheme`)
- **코드 블록 렌더링**: shiki 기반 신택스 하이라이팅, 비개발자 친화 색상 톤
- **이미지 표시**: 로컬 상대경로 + 원격 URL (CSP 정책 명시)
- **목차(TOC) 사이드바**: 자동 생성, 클릭 스크롤
- **확대/축소**: ⌘+ / ⌘- / ⌘0
- **인쇄 / PDF로 저장**: macOS 시스템 인쇄 다이얼로그 활용
- **에러 UX·접근성·i18n 폴리싱** (사이클 10)
- **미서명 DMG 배포 + Homebrew Cask 등록 + Gatekeeper 우회 안내 문서**
- **CLI-only 빌드/배포 파이프라인** — `npm run dist`로 dmg 생성 가능

### Phase 2 (다음, 검증 후 결정)

- **배포 전략 전환** (게이트 통과 시): Apple Developer Program 가입 → 노타라이즈 DMG → 자동 업데이트 (Squirrel.Mac 또는 `electron-updater`). 첫 사이클 묶음은 0.4 참조.
- **여러 파일 탭/윈도우 관리** (윈도우 단위 상태 격리는 MVP에서 미리 마련)
- **검색** (현재 문서 내, ⌘F)
- **다중 파일 폴더 뷰**
- **사용자 설정 폰트/테마**
- **Mermaid 다이어그램** (`mermaid` npm)
- **수식(LaTeX/KaTeX)** (`katex` npm)
- **북마크/즐겨찾기**
- **CSP `style-src` nonce 강화** (4.4.1 참조 — Phase 2 진입 시 검토)
- **마크다운 인라인 HTML allowlist 확장** (사용자 요구 누적 시)

### Phase 3 (탐색, 가설 수립 단계)

- **Mac App Store** 출시 (Electron 앱은 샌드박스 호환 작업이 별도 필요)
- 사용 통계 기반 추가 기능 결정

### 명시적 비범위 (Non-Goals)

- **편집 기능 전혀 없음** — 한 글자도 수정 불가.
- **Windows / Linux 지원 안 함 (Phase 1)** — 단, **코드는 0.3 가이드에 따라 OS 분기 격리 유지**(Phase 2+ 확장 옵션 보존). 빌드 산출물은 macOS 단일.
- **iOS / iPadOS 지원 안 함**.
- **클라우드 동기화·계정 시스템 없음**.
- **다국어 UI는 영어 + 한국어만**.
- **마크다운 변형(Wiki Links, Obsidian 문법 등)은 지원 안 함** — CommonMark + GFM만.
- **AI 요약·번역 기능 없음**.
- **플러그인 시스템 없음**.
- **유료화·인앱 결제 없음**.
- **사용자 분석 SDK 없음** — 텔레메트리 일체 없음.
- **macOS Quick Look 확장** — Electron으로 사실상 불가. **이전 플랜의 Phase 2 후보 → Drop 또는 Phase 3+ 별도 네이티브 헬퍼로 검토.**

---

## 3. 사용자와 사용 시나리오

### 주요 사용자

- **사용자 그룹 A (1차, 비개발자)**: 회사에서 개발팀이 공유한 README를 받아보는 기획자/디자이너/PM/HR/마케터.
- **사용자 그룹 B (2차, 개발자)**: 본인 문서를 비개발자에게 공유 전 미리보기. 또는 OSS README를 깔끔하게 읽고 싶은 사람. **그룹 B가 그룹 A의 설치를 도와주는 채널**(Homebrew, README 공유)이 핵심 유통 가설.

### 핵심 사용 시나리오

1. **공유받은 README 열기**: PM 지윤이 `프로젝트_안내.md`를 Slack으로 받았다. Finder에서 더블클릭하니 md_dolphin이 열리고, 잘 디자인된 아티클처럼 본문이 표시된다.

2. **사이드바 목차로 긴 문서 훑기**: 디자이너 우진이 50쪽짜리 디자인 시스템 가이드 .md를 받았다. 좌측 사이드바의 자동 목차에서 "Color Tokens" 클릭 → 즉시 해당 위치로 스크롤.

3. **다크 모드 야간 독서**: 마케터 수아가 밤에 침대에서 회사의 마크다운 정책 문서를 본다. macOS 다크 모드이므로 md_dolphin도 자동 다크.

4. **개발자의 사전 검토**: 개발자 민호가 본인이 쓴 README를 비개발자 동료에게 공유 전 md_dolphin으로 미리 본다. 동료에게 `brew install --cask md-dolphin` 한 줄을 함께 보낸다.

5. **PDF로 출력해 회의 자료화**: HR 매니저가 사내 마크다운 정책 문서를 ⌘P → "PDF로 저장"으로 변환해 임원 회의 자료로 인쇄.

6. **(설치 시나리오) 첫 다운로드 사용자**: 비개발자 지윤이 GitHub Releases에서 `md_dolphin.dmg`(~130MB)를 받는다. README의 "처음 여는 방법" 안내대로 우클릭 → "열기"로 정상 실행.

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
- shiki는 wasm 기반이라 첫 로드에 약간의 지연 — 사이클 6에서 lazy loading 검증.

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
| IPC 메시지                    | 모든 IPC 채널에 대해 main 측 입력 검증 (path traversal 방지)                                                                                  |

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

**1차 권장: React** — 본 프로젝트가 단일 페이지에 가깝지만 사이드바·메뉴·다이얼로그 등 컴포넌트 단위 분할이 명확하고, Claude Code의 React 지원이 가장 강함. **사용자가 Vue/Svelte 명시 선호 시 사이클 1 시작 전 변경 가능.** 미명시 시 React로 자동 진행(0.2 G2).

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

---

## 5. 가독성 향상 전략 (일반인 친화적 측면)

이 섹션은 **이 프로젝트의 핵심 가치 제안**이므로 상세히 정의한다. CSS 변수와 React 컴포넌트로 구현.

### 5.1 타이포그래피

- **본문 폰트 (CSS `font-family`)**:
  - 영문: `-apple-system, "SF Pro Text", system-ui` (시스템 폰트로 macOS 네이티브 톤 흉내)
  - 한글: `"Apple SD Gothic Neo", "Pretendard", sans-serif` (Pretendard는 옵션 번들, OFL)
  - **fallback 체인 명시**: 한글-영문 혼용 시 자간 깨짐 방지
- **본문 크기**: 17px (기본), ⌘+/-로 13~24px 조정 (`webContents.zoomFactor` 활용)
- **행간(line-height)**: **1.7**
- **자간(letter-spacing)**: 한글 -0.01em, 영문 0
- **본문 폭(measure)**: **680px 최대**, 그 이상은 좌우 여백
- **단락 간격**: 1.2em
- **제목 위계**: H1 32px / H2 26px / H3 20px / H4 18px / 본문 17px (모듈러 스케일 1.25)

### 5.2 색상과 대비 (CSS 변수)

```css
/* 라이트 */
--bg: #fafaf7;
--text: #1c1c1e;
--quote-bar: #a0a0a5;
--code-bg: #f2f2ee;

/* 다크 */
--bg-dark: #1c1c1e;
--text-dark: #e8e8e3;
--code-bg-dark: #2a2a2d;
```

- **WCAG AA 대비비** 4.5:1 이상 보장.
- `nativeTheme.shouldUseDarkColors`로 시스템 외관 자동 추종, 사용자 강제 라이트/다크 옵션은 Phase 1 후반.

### 5.3 코드 블록을 비개발자가 봐도 위협적이지 않게

- **monospace 폰트**: `"SF Mono", "JetBrains Mono", monospace`. 글자 크기 본문보다 1px 작게 (16px).
- **부드러운 카드**: 배경색 본문보다 5% 어두움, 모서리 8px. 검정 IDE 톤 절대 사용하지 않음.
- **언어 라벨**: 코드 블록 우상단 작은 회색 라벨.
- **신택스 하이라이팅 (shiki)**: 채도 낮은 파스텔 톤. 커스텀 테마(`light-soft`, `dark-soft`) 정의.
- **인라인 코드**: 옅은 회색 칩.
- **복사 버튼**: hover 시 우상단 표시. `navigator.clipboard.writeText`로 클립보드 복사.

### 5.4 표·이미지·링크

- **표**: 줄무늬 행, 셀 패딩 12px / 16px, 헤더 굵게 + 살짝 어두운 배경, `overflow-x: auto`로 가로 스크롤.
- **이미지**: `max-width: 100%`, 가운데 정렬. **alt 텍스트를 캡션**으로 표시. 클릭 시 라이트박스(자체 React 모달).
- **링크**: 색상 `#0A66C2`(라이트) / `#5BA8FF`(다크). **외부 링크 아이콘(↗) 추가**. Hover 툴팁(URL 표시).

### 5.5 부가 가치 (MVP 포함 / Phase 2 분리)

| 기능                    | MVP               | Phase 2              | 비고                                       |
| ----------------------- | ----------------- | -------------------- | ------------------------------------------ |
| 자동 목차(TOC) 사이드바 | O                 |                      | 헤딩 H1~H3 자동 추출                       |
| 클릭 시 부드러운 스크롤 | O                 |                      | UX 핵심                                    |
| ⌘F 문서 내 검색         |                   | O                    | MVP 후                                     |
| 인쇄·PDF 저장           | O                 |                      | `webContents.print()` / `printToPDF()`     |
| 다중 탭                 |                   | O                    | 윈도우별 상태 격리는 MVP에서 미리 마련     |
| Mermaid·LaTeX           |                   | O                    | 외부 의존성 큼. 파서 전환 룰은 4.2.2 참조. |
| Quick Look 확장         |                   | (Drop 또는 Phase 3+) | Electron으로 사실상 불가                   |
| **에러 UX·접근성·i18n** | **O (사이클 10)** | 강화                 | 신규 사이클로 보장                         |
| 가상 스크롤             | O (사이클 9)      |                      | `react-virtuoso` 1만 줄 .md 성능 보장      |

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
| **사이클 6 변경**        | Splash → shiki. **1만 줄 fixture 회귀 게이트**. shiki nonce는 Phase 2.                                                                                                                   |
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
| 6   | **코드 블록 일반인 친화 디자인**                 | 부드러운 카드, 언어 라벨, **shiki 신택스 하이라이팅**, 복사 버튼. **1만 줄 회귀 ≤ 5초 게이트**.                                                                                                                                                                                                                | `CodeBlockView`, shiki 커스텀 테마 (`light-soft`, `dark-soft`), 복사 버튼                                                           | 4, 5    | 사후                            |
| 7   | **이미지·링크·인용문 폴리싱**                    | 이미지 alt 캡션, 라이트박스 모달, 링크 hover 툴팁, 인용문 디자인. 외부 링크는 `shell.openExternal`. **DOMPurify `style` strip (P2-2)**. **로컬 자산 protocol 화이트리스트 (P2-7)**. **1만 줄 회귀 ≤ 5초 게이트**.                                                                                              | 각 컴포넌트 + sanitize 레이어, `mddolphin-asset://` 핸들러                                                                          | 5       | 사후                            |
| 8   | **목차(TOC) 사이드바**                           | 헤딩 추출(markdown-it 기반), 사이드바 표시, 클릭 스크롤, 토글.                                                                                                                                                                                                                                                 | `OutlineExtractor`, `SidebarView`, 스크롤 점프 로직                                                                                 | 2       | **TDD** (Extractor)             |
| 9   | **확대/축소 + 시스템 메뉴 + 성능 + 가상 스크롤** | ⌘+/-, ⌘0, macOS 표준 메뉴, 인쇄, PDF 저장. **4.7.3 성능 벤치 표준**으로 측정: 1만 줄 1초, 메모리 500MB, 콜드 스타트 1.5초. **`react-virtuoso` 가상 스크롤 도입**. 5/6/7 회귀 게이트가 5초를 초과했다면 본 사이클을 앞당겨 진행.                                                                                | 메뉴 명령 핸들러 (main), 벤치마크 측정 보고서, `react-virtuoso` 통합                                                                | 3, 6, 7 | TDD (벤치)                      |
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
   - [ ] 노타라이즈 전환 시 필요한 작업 체크리스트 별도 문서 (0.4 사이클 P2-1 참조)
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

---

## 7. 기술적 미지(Unknowns)

| 미지                                                            | 위험도     | 해소 시점                           | 해소 방법                                                                                                                                        |
| --------------------------------------------------------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **markdown-it GFM 플러그인 커버리지** (정렬된 표, 체크박스 등)  | 낮음       | 사이클 5 시작 전                    | 0.5일 스파이크: 토큰 출력 검증. 부족한 부분은 자체 렌더러에서 보강.                                                                              |
| **자체 React 렌더러의 큰 파일(1만+ 줄) 성능**                   | 높음       | 사이클 5/6/7 회귀 게이트 + 사이클 9 | 4.7.3 벤치 표준으로 측정. 사이클 5/6/7 회귀 ≤ 5초. 초과 시 사이클 9를 앞당겨 `react-virtuoso` 도입.                                              |
| **shiki wasm 초기 로드 지연**                                   | 중         | 사이클 6                            | Lazy load + 첫 코드 블록까지 지연 허용. 또는 사전 빌드 시점에 정적 HTML 생성.                                                                    |
| **Electron 콜드 스타트 시간 (1.5초 이내)**                      | 중         | 사이클 9                            | 4.7.3 벤치 표준으로 측정 후 splash 색상 사전 적용 / asar 압축 / 불필요 의존성 제거.                                                              |
| **번들 크기 (130MB 이내)**                                      | 중         | 사이클 11a                          | electron-builder `compression: maximum`, asar, 불필요 ICU 데이터 제거.                                                                           |
| **한글-영문 혼용 자간/조판 품질 (Chromium 렌더링)**             | 중         | 사이클 4                            | 한국어 README 5개로 시각 검토. 부족 시 Pretendard 번들 결정.                                                                                     |
| **미서명 DMG의 Gatekeeper 우회 절차가 macOS 버전별로 다름**     | 중         | 사이클 11a                          | macOS 12·13·14·15 네 버전에서 직접 실행 테스트, 우회 단계 차이 문서화.                                                                           |
| **Homebrew Cask 등록 절차와 자체 tap vs 공식 tap 트레이드오프** | 낮음       | 사이클 11b                          | 자체 tap으로 시작 → 안정화 후 공식 cask 제출.                                                                                                    |
| **Electron 보안 표면 (IPC 검증, sanitize, CSP)**                | 중         | 사이클 1·3·7                        | 사이클 1에서 contextIsolation 의무화 + CSP `<meta>` + webRequest 이중방어, 사이클 3에서 IPC 입력 검증, 사이클 7에서 DOMPurify(style strip) 통합. |
| **메모리 누수 (다중 윈도우 Phase 2 대비)**                      | 중         | 사이클 9                            | Chromium DevTools Memory 프로파일러로 누수 검증. 윈도우 close 시 Zustand 스토어 dispose.                                                         |
| **Universal Binary 빌드 시간 (P2-10)**                          | 중         | 사이클 11a                          | macos-14 러너에서 `time pnpm dist` 측정. 30분 초과 시 arm64 우선 릴리스 옵션.                                                                    |
| **Mermaid+KaTeX 동시 도입 시 파서 전환 비용 (P2-6)**            | 낮음(현재) | Phase 2 진입 시점                   | 4.2.2 의사결정 룰 적용. 단독이면 markdown-it 유지, 동시면 remark 검토.                                                                           |

---

## 8. 외부 의존성 및 위험

| 의존                             | 실패 시 영향                               | 대안                                                                                      |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Electron** (Chromium + Node)   | 앱 자체                                    | Tauri로 마이그레이션 가능 (대규모 작업). 실패 가능성 매우 낮음.                           |
| **markdown-it**                  | 파싱 전면                                  | remark/rehype 또는 micromark로 대체 가능. 토큰 변환 어댑터만 교체. 비용은 4.2.2.          |
| **shiki**                        | 코드 색상 표현 손실                        | Prism.js 또는 highlight.js로 대체 가능.                                                   |
| **DOMPurify / sanitize-html**    | XSS 방어 손실 — 보안 치명적                | 둘 중 하나 의무 사용. 둘 다 활성 유지보수.                                                |
| **react-virtuoso**               | 큰 파일 성능 저하                          | `react-window` 또는 자체 가상화 구현                                                      |
| **Pretendard 폰트** (OFL)        | 폰트 누락 시 시스템 폰트 fallback          | Apple SD Gothic Neo로 우아하게 대체                                                       |
| **i18next**                      | 다국어 손실                                | react-intl로 대체 가능                                                                    |
| **electron-builder**             | 패키징 실패                                | electron-forge로 대체 (사이클 11a에서 결정 게이트)                                        |
| **GitHub Releases (배포 채널)**  | 다운로드 불가                              | Homebrew Cask 채널 병행. Cloudflare R2 자체 호스팅도 옵션                                 |
| **Homebrew Cask**                | 설치 자동화 채널 손실                      | GitHub Releases 직접 다운로드로 우회                                                      |
| **macOS Gatekeeper 정책 변화**   | 미서명 앱 우회 불가                        | 결정 게이트 시그널 모니터링, 트리거 시 노타라이즈 전환                                    |
| **Xcode Command Line Tools**     | 코드 서명·공증 불가 (Phase 2 진입 후 영향) | macOS 표준 도구라 누락 가능성 낮음. Phase 1은 미서명이라 영향 없음.                       |
| **GitHub Actions macos-14 러너** | Universal Binary 빌드 시간 변동            | (P2-10) 30분 초과 시 arm64 우선 릴리스 옵션. macos-13 러너로 fallback 가능(x64 네이티브). |

**의도적으로 회피한 의존성**:

- Apple Developer Program ($99/년) — Phase 1 비범위
- 클라우드, 분석 SDK, 결제, 인증, AI API — 의도적 배제

---

## 9. 운영 계획

- **배포 (Phase 1)**:
  - **GitHub Releases**로 미서명 `.dmg` 직접 배포 + SHA256 체크섬
  - **Homebrew Cask** 병행 — `auto_updates: false` + `livecheck` GitHub Releases (P2-11)
  - Apple Developer Program **가입하지 않음**
  - README에 Gatekeeper 우회 안내 + **번들 크기·메모리 솔직 표기 (130MB / 200MB)** 필수

- **배포 (Phase 2 — 게이트 통과 시)**:
  - 첫 사이클 묶음은 0.4 (사이클 P2-1) 참조
  - Apple Developer Program 가입 → Developer ID → `electron-builder` notarize 자동화 (`afterSign` 훅)
  - **`electron-updater`** 자동 업데이트 도입 → Cask `auto_updates: true`로 변경
  - Mac App Store는 Phase 3 이후 (Electron 앱은 샌드박스 호환 작업 별도)

- **모니터링**:
  - **로컬 충돌 로깅** — `app.on('render-process-gone')`, `app.on('child-process-gone')` 캡처. 사용자 데이터 외부 전송 없음. 로그는 사용자가 수동으로 GitHub Issues에 첨부.
  - **GitHub Issues 라벨링** — `installation-failure`, `gatekeeper`, `crash`, `bundle-size` 등으로 결정 게이트 시그널 추적
  - **외부 분석 SDK 없음**

- **백업**: 앱 자체가 사용자 파일을 저장하지 않음. 사용자 설정은 `electron-store`(JSON in `~/Library/Application Support/md_dolphin/`) — 손실 시 기본값.

- **비용 (Phase 1)**:
  - 개발자 계정: **$0**
  - 호스팅: **$0** (GitHub Releases + Homebrew Cask)
  - 도메인 (선택): **$15/년**
  - **총 운영 비용: 연 $0~15**

- **비용 (Phase 2 게이트 통과 시)**:
  - Apple Developer Program: $99/년
  - **총 운영 비용: 연 $99~115**

- **버전 정책**: 시맨틱 버저닝(MAJOR.MINOR.PATCH). macOS 12 미만 호환은 영구히 비범위.

---

## 10. 자체 검증 결과

**Electron 전환 + CLI-only 워크플로 검증 완료** (1라운드, 2026-04-29).
**P2 라운드 반영 완료** (architect P2-1~P2-12, 2026-04-29).

### CEO 관점 (비즈니스 검증)

- [x] **사용자 가치 명확** — "비개발자가 마크다운을 책처럼 읽을 수 있다"
- [x] **측정 가능한 성공 지표** — 다운로드, Stars, 인터뷰 응답률, 설치 성공률, 번들 크기 거슬림 응답률, **콜드 스타트 정성 응답률(P2-3)**
- [x] **우선순위가 가치 기반** — 가독성·타이포그래피를 사이클 2~7에 집중
- [x] **검증 가설 명시** — 가설 1: "비개발자가 마크다운 뷰어를 필요로 한다" / 가설 2: "미서명 DMG라도 OSS 신뢰로 설치 가능" / 가설 3: "Electron 번들 크기(~130MB)는 비개발자에게 결정적 장벽이 아니다"
- [x] **하지 않을 것 명시** — Non-Goals 11개 항목 (Quick Look 추가 명시)
- [x] **경쟁·대체재 고려** — TextEdit, Quick Look 기본, Typora, MacDown, VS Code 분석
- [x] **운영 비용 < 가치** — 연 $0~15 (Phase 1)
- [x] **수익 모델 확정** — 무료 OSS
- [x] **앱 아이덴티티** — `md_dolphin` 유지
- [x] **접근성·i18n MVP 보장** — 사이클 10
- [x] **CLI-only 워크플로 보장** — 모든 사이클이 셸에서 완결되도록 산출물 명시
- [x] **사이클 1 진입 게이트 명확화 (P2-1, NEW)** — 사용자 결정 필수 항목 1건(Tauri B안 재검토)으로 수렴, 나머지는 합리적 기본값

**미해결 또는 약점**:

- **Electron 채택의 인상 리스크 (정직히 인정)** — 비개발자에게 130MB 다운로드는 "왜 이렇게 큰가"라는 위화감. 완화 방안: 다운로드 페이지에 솔직한 설명, FAQ 항목, 빠른 시작 화면. 검증 지표: 인터뷰에서 "번들 크기 거슬림" 응답 30% 미만 (1차 5명, 게이트 시그널 발생 시 30명 추가).
- **Quick Look 확장 포기로 macOS 통합 가치 일부 미발현** — 이전 SwiftUI 플랜의 Phase 2 후보였으나 Electron에서는 사실상 불가. Drop 또는 Phase 3+ 별도 네이티브 헬퍼로 검토.
- **마케팅·유통 채널** — Homebrew Cask 바이럴 가설 의존. 비개발자 직접 도달 채널은 Phase 2 노타라이즈 후 강화.

### CTO 관점 (기술 검증)

- [x] **스택이 사용자 워크플로에 비례** — Electron + TS + Vite는 사용자의 CLI-only 선호와 정확히 부합. Xcode 강제 회피.
- [x] **기술적 미지 식별과 해소 시점** — 12개 미지를 표로 정리, 각각 사이클에 PoC 일정 배치 (P2-6, P2-10 추가)
- [x] **외부 의존 실패 모드** — Electron, markdown-it, shiki, DOMPurify, react-virtuoso, electron-builder, macos-14 러너 등 모두 fallback 또는 결정 게이트 존재
- [x] **데이터 모델 잠금 없음** — TypeScript 인터페이스 도메인 타입만 노출. markdown-it 토큰 외부 노출 제거. **`Heading.offset` 어댑터 변환 명시 (P2-6)**
- [x] **상태 관리 표준 명시** — Zustand 채택, 윈도우 단위 격리, ThemeProvider Context, **`DocumentWindow.baseDir` 추가 (P2-7)**
- [x] **파싱·렌더링 분리** — markdown-it(파싱) + 자체 React 렌더러. **파서 전환 비용 사전 인정 (P2-6)**
- [x] **보안 민감 영역 식별 (Electron 특유)** — contextIsolation/sandbox/nodeIntegration 의무, contextBridge 좁은 표면, DOMPurify, **CSP `style-src` 결정 근거 명시 + webRequest 이중방어 (P2-2)**, **로컬 자산 protocol 화이트리스트 (P2-7)**, **markdown-it `html: false` (P2-8)**
- [x] **사이클 응집도 (P2-4)** — 사이클 1을 "필수/완비/사이클 11a 직전까지" 3단으로 분리. 사이클 2(렌더러)는 도메인 모델 입력으로 못박힘, 사이클 3(파일 열기)이 사이클 4(테마) 이전.
- [x] **테스트 가능성** — 도메인 모델, FileService, OutlineExtractor 모두 인터페이스 격리. React는 Vitest + RTL + Playwright. **1만 줄 fixture 표준화 (P2-3, P2-5)**
- [x] **운영 계획** — 배포(GitHub Releases + Homebrew), 충돌 로깅(로컬), 비용 포함. **Cask `auto_updates: false` + `livecheck` (P2-11)**
- [x] **macOS 최소 버전 결정** — Monterey 12 (Electron 35 호환)
- [x] **Phase 2 전환 경로 명시** — 노타라이즈 게이트, **첫 사이클 묶음 사전 정의 (P2-12)**, electron-updater 도입, Mac App Store는 Phase 3
- [x] **사이클 11(배포) 일정 현실화** — 11a/11b 분할, **빌드 시간 30분 측정 + arm64 우선 릴리스 fallback (P2-10)**
- [x] **CLI-only 빌드 파이프라인** — 사이클 1·11a에서 셸 명령으로 완결 가능 검증
- [x] **성능 벤치 표준 (P2-3, NEW)** — 환경·도구·합격 판정 명시. 사이클 5/6/7 회귀 게이트로 조기 경보.
- [x] **크로스플랫폼 친화 가이드 (P2-9, NEW)** — 0.3에 단순 규칙 명시. 사이클 spec 의무 항목으로 흡수.

**미해결 또는 약점**:

- **자체 React 렌더러의 GFM 점증적 구현 비용** — 사이클 5에서 표·체크박스 자체 구현. 0.5일 스파이크로 비용 측정.
- **Electron 보안 표면 확대** — sanitize / CSP / IPC 검증 누락 시 XSS·로컬 파일 노출 위험. 사이클 1부터 의무 설정으로 시작 부담 분산. **CSP `'unsafe-inline'`은 Phase 2 nonce 강화 예정.**
- **메모리·번들 크기 트레이드오프** — Tauri 대비 명백한 손실. 사이클 9에서 측정 후 30% 초과 시 압축·정리 의무화.
- **Universal Binary 빌드 시간 미검증** — macos-14 러너 실제 시간 미측정. 사이클 11a에서 측정 → 초과 시 arm64 우선 릴리스로 회피.

### 미해결 이슈 (사용자 결정 필요)

P2 라운드 반영 후, 사용자 결정이 **반드시 필요한 항목은 1건으로 수렴**한다(0.2 진입 게이트 G1).

1. **Tauri B안 재검토 여부 (G1, 사이클 1 진입 차단 게이트)** — 현재 A안(Electron) 진행이 기본값. 사용자가 "B안으로 전환" 또는 "A안 유지"를 명시 응답하면 게이트 통과. 미응답 시 A안으로 자동 진행.

**자동 진행되는 항목 (사용자 결정 없이 기본값 적용)**:

- **Windows / Linux 확장 여부** — A안 채택(Phase 1 macOS only + 코드 친화). 0.3 가이드 적용. 사용자 변경 시 결정 4 갱신.
- **macOS 최소 버전** — macOS 12 Monterey 확정.
- **렌더러 프레임워크** — React 18 (G2 기본값). Vue/Svelte 명시 선호 시 변경 가능.
- **빌드 도구** — electron-builder (G4 기본값). Forge 선호 시 변경 가능.
- **번들 크기 표기** — 솔직 표기 (G5 기본값).

**남은 마이너 결정 (사이클 진행 중)**:

- OSS 라이선스 종류 (MIT 권장)
- Homebrew Cask: 자체 tap 우선 vs 공식 cask 직행 (사이클 11b 시작 시)
- 도메인 등록 여부 (Phase 1 후반)
- 사이클 5 진행 중 markdown-it GFM 커버리지 부족 시 plugin 추가 결정
- 마크다운 인라인 HTML allowlist 확장 시점 (사이클 7 또는 Phase 2)

---

## 11. 가정 (Assumptions)

플랜의 전제. 어긋나면 플랜 갱신:

- 비개발자가 받는 마크다운 문서는 대개 **README, 정책 문서, 릴리스 노트** 같은 **수천 줄 이내** 단일 파일.
- 사용자(개발자 본인)는 **TypeScript / Node.js 생태계 익숙**. Rust 학습 곡선은 부담.
- 사용자는 **Xcode IDE를 한 번도 열지 않는** 워크플로를 강하게 선호 (이번 스택 전환의 직접 사유).
- macOS 12+ 사용자가 macOS 사용자의 **80% 이상** (Apple 통계 기준).
- 1인 또는 2~3인 개발 팀이 **3~4개월 안에 MVP** 완성 가능 (사이클 12개 × 평균 2일 = 24일 + 버퍼).
- 개발자 사용자의 **바이럴**(비개발자 동료에게 추천 + Homebrew 한 줄 설치 안내)이 핵심 유통 채널.
- 비개발자 다수는 130MB 다운로드를 거부하지 않음 (검증 대상 가설).
- 미서명 DMG 사용자 다수는 README 안내를 따라 우회 설치 가능 (검증 대상).
- 결정 게이트 시그널 발생 시 4~6주 이내 Apple Developer Program 가입과 노타라이즈 파이프라인 구축 가능 (0.4 사이클 P2-1).
- markdown-it / shiki / DOMPurify가 향후 1년 내 활발히 유지보수됨 (npm 통계 기준 합리적 가정).
- GitHub Actions macos-14 러너의 빌드 시간이 30분 이내 (Universal Binary 빌드 포함). **검증은 사이클 11a에서 수행 (P2-10)**.
- 1만 줄 fixture 회귀 시간이 사이클 5/6/7 단계에서 5초 이내 유지 가능. 초과 시 사이클 9를 앞당겨 가상 스크롤 도입.

---

## 12. 다음 액션

1. **사용자에게 G1만 확인**: Tauri B안 재검토 여부 (A안 유지 / B안 전환). **응답 없으면 A안 자동 진행**.

2. **사이클 1 (부트스트랩) spec-writer에게 의뢰** — G1 응답 후. G2~G6은 본 플랜 기본값으로 자동 통과.

3. **사이클 2 시작 시** `tests/fixtures/large-10k.md` 표준 fixture 정착. 이후 사이클 5/6/7에서 회귀 게이트로 활용.

4. **사이클 5 시작 전** markdown-it GFM 플러그인 커버리지 PoC (0.5일).

5. **사이클 5/6/7 종료 시** 1만 줄 회귀 ≤ 5초 게이트 점검. 초과 시 사이클 9를 앞당김.

6. **사이클 9** 4.7.3 성능 벤치 표준 적용 → 콜드 스타트 / 메모리 / 번들 크기 측정 → 임계치 초과 시 압축·정리 의무화.

7. **사이클 11a 진행 중** macOS 12·13·14·15 네 버전에서 미서명 DMG 우회 절차 직접 검증 + **빌드 시간 측정 (P2-10)**.

8. **사이클 11b 진행 시** Homebrew Cask `auto_updates: false` + `livecheck` 설정 (P2-11).

9. **출시 후 4주간** 결정 게이트 시그널 모니터링 → Phase 2 전환 여부 판단. 통과 시 0.4 사이클 P2-1 의뢰.

---

**자체 검증 완료** (planner, P2 라운드, 2026-04-29).
