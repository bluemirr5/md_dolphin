# Phase 2 전환 체크리스트

**용도**: Phase 2 진입 결정 후 `사이클 P2-1: 노타라이즈 파이프라인` 실행 시 사용.
**참조**: `docs/plans/05-changelog.md` 0.4, `docs/plans/01-decisions.md` 결정 6.

---

## 결정 게이트 — Phase 2 진입 트리거

아래 5종 시그널 중 **2개 이상** 관측 시 Phase 2 진입을 검토한다.

| # | 시그널 | 임계치 |
|---|--------|--------|
| 1 | `installation-failure` 유형 이슈/피드백 | 4주 내 **5건+** |
| 2 | 다운로드 대비 활성 피드백 비율 | 다운로드 **200+** 대비 활성 피드백 **10건 미만** (설치 장벽 신호) |
| 3 | 인터뷰/DM에서 설치 포기 언급 비율 | **30%+** |
| 4 | Homebrew Cask 설치 비중 | 전체 설치 중 **70%+** (DMG 직접 다운로드 회피 신호) |
| 5 | macOS 정책 변화 (Gatekeeper 강화 등) | **1건+** |

**2개 이상** 관측 시 즉시 Phase 2 진입 사이클(P2-1)을 spec-writer에 의뢰한다.

---

## 7단계 실행 순서

### 1단계 — Apple Developer Program 가입

- [ ] https://developer.apple.com/programs/enroll/ 에서 Individual 계정으로 가입
- [ ] 연 USD 99 결제 완료
- [ ] Apple 심사 통과 확인 (1~3 영업일 소요)

### 2단계 — CSR 생성 + Developer ID 인증서 발급

- [ ] `Keychain Access` → 인증서 지원 → 인증 기관에서 인증서 요청 → CSR 파일 생성
- [ ] Apple Developer 포털에서 Developer ID Application 인증서 생성 + 다운로드
- [ ] 키체인에 `.p12` 형식으로 저장

### 3단계 — `mac.identity` 설정 + 키체인 통합

- [ ] `electron-builder.yml`의 `identity: null` 제거 후 Developer ID 인증서 이름으로 교체
- [ ] GitHub Actions에 `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD` 시크릿 추가
- [ ] CI 키체인 통합 스크립트 작성 (`security import` + `security set-key-partition-list`)

### 4단계 — `afterSign` 노타라이즈 스크립트 + entitlements 활성

- [ ] `@electron/notarize` 설치 (`pnpm add -D @electron/notarize`)
- [ ] `build/notarize.js` 스크립트 작성 (`afterSign` 훅)
- [ ] `electron-builder.yml`에 `mac.entitlements: build/entitlements.mac.plist` + `mac.entitlementsInherit` 설정
  - `build/entitlements.mac.plist` 는 stub으로 존재 (사이클 11a 생성)
- [ ] `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` 시크릿 추가

### 5단계 — 첫 노타라이즈 빌드 + Apple 응답 검증

- [ ] `pnpm dist` 로컬 실행 → `xcrun notarytool log` 로 노타라이즈 응답 확인
- [ ] Gatekeeper 검증: `spctl --assess --type exec -v md_dolphin.app`
- [ ] `codesign -dv --verbose=4 md_dolphin.app` 서명 체인 확인
- [ ] GitHub Actions release.yml 통과 + DMG·SHA256SUMS.txt 자산 확인

### 6단계 — README Gatekeeper 안내 → 더블클릭 실행 문구로 갱신

- [ ] `README.md` `#gatekeeper-bypass` 섹션 내용 교체 ("더블클릭으로 바로 실행됩니다")
- [ ] `README.ko.md` `#gatekeeper-우회-안내` 섹션 동일 갱신
- [ ] `release/release-notes.template.md` Gatekeeper 언급 제거
- [ ] `docs/screenshots/install/` 스크린샷 5장 → 노타라이즈 후 더블클릭 플로우로 교체

### 7단계 — electron-updater 도입 + Cask `auto_updates: true` 전환

- [ ] `electron-updater` 설치 (`pnpm add electron-updater`)
- [ ] 자동 업데이트 IPC 채널 구현 (main ↔ renderer 알림)
- [ ] `homebrew-tap/Casks/md-dolphin.rb` — `auto_updates false` → `auto_updates true`
- [ ] `.github/PULL_REQUEST_TEMPLATE/cask-auto-updates.md` 체크리스트 사용하여 Cask PR 생성
- [ ] `docs/plans/05-changelog.md` Phase 2 완료 마킹

---

## 관련 파일

- `electron-builder.yml` — `identity`, `entitlements` 설정
- `build/entitlements.mac.plist` — Phase 2 활성 시 내용 채울 것
- `homebrew-tap/Casks/md-dolphin.rb` — `auto_updates` + `sha256` 갱신
- `.github/PULL_REQUEST_TEMPLATE/cask-auto-updates.md` — Cask PR 체크리스트
- `docs/plans/05-changelog.md` 0.4 — Phase 2 첫 사이클 사전 정의
