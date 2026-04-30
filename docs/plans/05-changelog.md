# 05. 확정 사항·변경 이력·진입 게이트

> 이 파일은 마스터 플랜의 **0장 전체**를 다룹니다 — 확정 사항(0), 변경 이력(0.1), 사이클 1 진입 게이트(0.2), 크로스플랫폼 가이드(0.3), Phase 2 첫 사이클(0.4), 트레이드오프, Tauri 옵션, 노타라이즈 게이트.
> 인덱스: `docs/plans/README.md`
> **갱신 빈도**: **사이클마다 0.1 표에 행 1개 추가** — doc-writer 의무 갱신 영역. **사이클 N+1 부채 메모도 0.1 표 끝에 누적**.

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
| 13  | **CSP `style-src` 정책 (NEW)**  | **옵션 (A) `'unsafe-inline'` 유지 + DOMPurify에서 style 속성 strip + shiki 인라인 스타일은 Phase 2에서 nonce 검토**. 자세한 근거는 4.4.1 참조 (`01-decisions.md`).    | 사이클 7에서 DOMPurify 설정에 style 속성 strip 의무. shiki nonce 작업은 Phase 2 게이트 통과 후 별도 사이클.                        |
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
| **2026-04-30** | **user**      | **사이클 5 종료 후 부채 메모**                       | 사이클 5(GFM) 코드 리뷰에서 발견된 사이클 2 잔존 결함을 사이클 6 표(7.1)에 끼워넣음: ① `MarkdownRenderer.tsx`의 `strong_open`/`em_open` 인라인 처리가 text 토큰만 추출 → `**[link](url)**` 등 중첩 마크업 손실, `renderInlineTokens` 재귀로 통일 ② `adapter.ts`의 `renderTokens` export 제거(사이클 2 동결 "외부 API는 `parseMarkdown`만" 위반 해소). |
| **2026-04-30** | **doc-writer** | **사이클 5 완료 마킹 + 미메모 항목 기록** | 벤치마크 문서 및 스펙 작성 완료(cycle-05-gfm.md 115줄, cycle-05-gfm-regression.md). AC7 합격: p50 5.08ms ≤ 5초. 사이클 6 항목에 추가: ③ App.tsx EMPTY_HINT_TEXT 데모 정리 ④ html_inline 우회 패턴(사이클 7 DOMPurify 정책 재검토) ⑤ gfm.css 표 색상 대비 미세 손실(사이클 9~10 다듬기). |
| **2026-04-30** | **doc-writer** | **사이클 6 완료 마킹** | shiki 1.29.2 통합 + 부채 5항목 정리 + 162 tests + WeakMap 캐시 P6-1 흡수 + 회귀 6.25ms 합격. `docs/plans/03-cycles.md` 6.1 사이클 표와 `docs/plans/01-decisions.md` 4.2.3 트레이드오프 갱신 의무. |
| **2026-04-30** | **planner** | **마스터 플랜 다중 파일 분할** | 단일 파일 1140줄 → 8개 파일 분할 (`README.md` 인덱스 + `00-vision.md`/`01-decisions.md`/`02-design-tokens.md`/`03-cycles.md`/`04-deps-impact.md`/`05-changelog.md`/`06-validation.md`). sub-agent별 read 부담 절감 + cross-reference 코드 매핑 표 인덱스에 정착. 절 번호(0.1, 4.4.2, 6.1 등) 원본 유지로 기존 spec의 cross-ref 인용 호환 유지. |
| **2026-05-01** | **doc-writer** | **사이클 7 완료 마킹 + 마스터 플랜 갱신** | 이미지·링크·인용문 + DOMPurify + 로컬 자산 protocol. 224 tests (+62). P7 라운드 13건 흡수(IPC 중복제거·shiki style 함수형·SVG/data:svg 차단·CSP 통일·windowId preload 주입·토큰 동결 회복·테스트 보강). `dompurify@3.4.1` 신규 의존성 추가. CSP `default-src 'none'` 표준 적용(4.4/4.4.1 갱신). 로컬 자산 URL 구조 `mddolphin-asset://<windowId>/<relPath>` 명시(4.4.2). 회귀 p50 4.39ms (사이클 6 대비 -29.7%). **사이클 9(성능)로 인계되는 부채 4건: CR7-5/9/10/11. CR7-12는 미발생 미룬 것 노트만**. |

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
- **사이클 spec 의무 기재 항목**에 "macOS 분기 정책 영향" 한 줄 추가(6.7 참조, `03-cycles.md`).

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
