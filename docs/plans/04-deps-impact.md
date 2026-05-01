# 04. 미지·외부 의존·운영

> 이 파일은 마스터 플랜의 **7·8·9장**을 다룹니다 — 기술적 미지(Unknowns), 외부 의존성 및 위험, 운영 계획.
> 인덱스: `docs/plans/README.md`
> **갱신 빈도**: 사이클 종료 시 미지 표 갱신, 새 의존성 추가 시 8장 갱신. doc-writer가 사이클 5/6/7/9/11a/11b 종료 시 우선 점검.

---

## 7. 기술적 미지(Unknowns)

| 미지                                                            | 위험도     | 해소 시점                           | 해소 방법                                                                                                                                        |
| --------------------------------------------------------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **markdown-it GFM 플러그인 커버리지** (정렬된 표, 체크박스 등)  | 낮음       | 사이클 5 시작 전                    | 0.5일 스파이크: 토큰 출력 검증. 부족한 부분은 자체 렌더러에서 보강.                                                                              |
| **자체 React 렌더러의 큰 파일(1만+ 줄) 성능**                   | 높음       | **사이클 11b 해소** | 4.7.3 벤치 표준으로 측정. 사이클 5/6/7 회귀 ≤ 5초 달성(p50 4.31~6.25ms). 사이클 9에서 `react-virtuoso` 도입으로 가상 스크롤 확보. 회귀 게이트 모두 합격.                                              |
| **shiki wasm 초기 로드 지연**                                   | 중         | **사이클 9 해소 + 강화** | 사이클 6: 정적 6~8개 언어 등록 + 모듈 싱글턴으로 wasm 1회 로드 한정. useEffect 비동기 적용 + plain fallback FOUC 회피. p50 첫 페인트 78ms. 사이클 9: lazy `loadLanguage`로 빌드 청크 700KB+ 축소 + 캐시 정책 측정 완료. 부채 메모: AC3d emacs-lisp 청크 804KB > 700KB 임계 (lazy 로드라 초기 번들 무영향, 사이클 10 emacs-lisp 제외 검토 권장).                                                                    |
| **Electron 콜드 스타트 시간 (1.5초 이내)**                      | 중         | **사이클 9 측정 진행 중** | 4.7.3 벤치 표준으로 측정. 사이클 9에서 IPC 인프라까지 완성됨. AC3b 콜드 스타트·AC3c 메모리 수동 측정은 사이클 10에서 마무리(CR9-S 권고).                                                              |
| **번들 크기 (130MB 이내)**                                      | 중         | 사이클 11a                          | electron-builder `compression: maximum`, asar, 불필요 ICU 데이터 제거.                                                                           |
| **한글-영문 혼용 자간/조판 품질 (Chromium 렌더링)**             | 중         | 사이클 4                            | 한국어 README 5개로 시각 검토. 부족 시 Pretendard 번들 결정.                                                                                     |
| **미서명 DMG의 Gatekeeper 우회 절차가 macOS 버전별로 다름**     | 중         | 사이클 11a                          | macOS 12·13·14·15 네 버전에서 직접 실행 테스트, 우회 단계 차이 문서화.                                                                           |
| **Homebrew Cask 등록 절차와 자체 tap vs 공식 tap 트레이드오프** | 낮음       | 사이클 11b                          | 자체 tap으로 시작 → 안정화 후 공식 cask 제출.                                                                                                    |
| **Electron 보안 표면 (IPC 검증, sanitize, CSP)**                | 중         | 사이클 1·3·7                        | 사이클 1에서 contextIsolation 의무화 + CSP `<meta>` + webRequest 이중방어, 사이클 3에서 IPC 입력 검증, 사이클 7에서 DOMPurify(style strip) 통합. |
| **메모리 누수 (다중 윈도우 Phase 2 대비)**                      | 중         | **사이클 9 검증 계획**              | Chromium DevTools Memory 프로파일러로 누수 검증. 윈도우 close 시 Zustand 스토어 dispose. 사이클 9에서 1만 줄 메모리 목표 500MB 검증.                                                         |
| **Universal Binary 빌드 시간 (P2-10)**                          | 중         | 사이클 11a                          | macos-14 러너에서 `time pnpm dist` 측정. 30분 초과 시 arm64 우선 릴리스 옵션.                                                                    |
| **Mermaid+KaTeX 동시 도입 시 파서 전환 비용 (P2-6)**            | 낮음(현재) | Phase 2 진입 시점                   | 4.2.2 의사결정 룰 적용. 단독이면 markdown-it 유지, 동시면 remark 검토.                                                                           |
| **vitest worker pool OOM** (사이클 5 발견)                      | 낮음       | **사이클 9 재평가 중**              | 현재 `NODE_OPTIONS='--max-old-space-size=4096'`으로 회피. 332 tests 누적에도 안정 유지. 사이클 10 이후 재평가 예정.                                    |
| **markdown-it-task-lists html_inline 우회 패턴** (사이클 5)     | 낮음       | **사이클 7 해소** | `html: false` 정책 하에서 html_inline 토큰을 React `<input>`으로 수동 변환하는 패턴 유지. 사이클 6 부채 ④ `docs/notes/cycle-06-html-inline-review.md` 검토 결과 적용: DOMPurify allowlist에 `<span style>` shiki 출력(--shiki-light/dark, color) 화이트리스트 함수 도입으로 해소. P7-2 shiki style allowlist 정규식→함수형 전환. |
| **blockquote inline 단독 토큰 처리** (사이클 7) | 매우낮음   | 미정 | 현 markdown-it CommonMark 설정에서 `blockquote_open` 없이 `inline` 토큰 단독으로 오는 경우 미발생. 파서 전환(remark 등) 또는 markdown-it 설정 변경 시 재점검. 사이클 7에서 실제 발생하지 않았으므로 미룬 것 노트만 유지(CR7-12). |
| **gfm.css 표 색상 대비** (사이클 5 발견)                         | 매우낮음   | 사이클 6 검토 완료, 사이클 9~10 (강화)           | 라이트 모드에서 표 테두리(`--quote-bar`) vs 짝수 행(`--code-bg`)의 색상 대비 일부 미세 손실. 신규 CSS 변수 금지 제약(사이클 4 토큰 동결) 때문에 사이클 5에서는 수정 불가. 사이클 6 부채 ⑤에서 재검토: WCAG AA 4.5:1 대비 만족 + 커스텀 라이트 테마(`light-soft`) 도입 시 해소 계획. 사이클 9~10 토큰 재검토 시 신규 변수 추가 검토. |

---

## 8. 외부 의존성 및 위험

| 의존                             | 실패 시 영향                               | 대안                                                                                      |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Electron** (Chromium + Node)   | 앱 자체                                    | Tauri로 마이그레이션 가능 (대규모 작업). 실패 가능성 매우 낮음.                           |
| **markdown-it**                  | 파싱 전면                                  | remark/rehype 또는 micromark로 대체 가능. 토큰 변환 어댑터만 교체. 비용은 4.2.2.          |
| **shiki**                        | 코드 색상 표현 손실                        | Prism.js 또는 highlight.js로 대체 가능.                                                   |
| **DOMPurify@3.4.1** (사이클 7) / sanitize-html | XSS 방어 손실 — 보안 치명적                | 사이클 7부터 DOMPurify 도입. 자체 `.d.ts` 동봉이라 `@types/dompurify` 불요. 둘 다 활성 유지보수. |
| **react-virtuoso**               | 큰 파일 성능 저하                          | `react-window` 또는 자체 가상화 구현                                                      |
| **Pretendard 폰트** (OFL)        | 폰트 누락 시 시스템 폰트 fallback          | Apple SD Gothic Neo로 우아하게 대체                                                       |
| **i18next@^26** (사이클 10)      | 다국어 손실                                | react-intl로 대체 가능. 사이클 10에서 v26 도입(스펙 ^23 예정이었으나 v26 상향)               |
| **react-i18next@^17** (사이클 10) | 다국어 손실                                | 사이클 10에서 v17 도입(스펙 ^14 예정이었으나 v17 상향)                                     |
| **iconv-lite@^0.6.x** (사이클 10) | 인코딩 감지 불가 — fallback만 가능        | 문자 손상 에러로 사용자 불편. 대안 없음(Node 내장 UTF-8 외 미지원). 32MB 입력 상한으로 BOMB 방어. |
| **@axe-core/react@^4.x** (사이클 10, dev only) | a11y 검증 미수행                           | dev 환경만 로드. production tree-shake로 번들 미포함. CR9-S1 verify-prod-bundle로 검증.    |
| **electron-builder ^26.8.1** (사이클 11a, devDep) | 패키징 실패                                | electron-forge로 대체 가능. 사이클 11a에서 ^26.x 도입(DMG + Universal Binary + GitHub Actions 자동화). |
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

- **배포 (Phase 1 — 사이클 11b 완료)**:
  - **GitHub Releases**로 미서명 `.dmg` 직접 배포 + SHA256 체크섬
  - **Homebrew Cask 자체 tap** 운영 시작 (`bluemirr5/homebrew-md-dolphin`) — `auto_updates: false` + `livecheck` GitHub Releases (P2-11)
  - Apple Developer Program **가입하지 않음** (Phase 1 비범위)
  - README 한·영 완성 — Gatekeeper 우회 안내(5단계 + 스크린샷) + **번들 크기·메모리 솔직 표기 (130MB / 200MB)** 정착
  - **거버넌스 4종** 정착 — LICENSE(MIT) / CONTRIBUTING.md / CODE_OF_CONDUCT.md(외부 URL 참조) / SECURITY.md
  - **Phase 2 체크리스트** 정착 — 5종 결정 게이트 임계치(4주 5건+ / 200+ vs 10건 미만 / 30%+ / 70%+ / 1건+) 명시, "2개 이상" 트리거

- **배포 (Phase 2 — 게이트 통과 시)**:
  - 첫 사이클 묶음은 0.4 (사이클 P2-1) 참조 (`05-changelog.md`)
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
