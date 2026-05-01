# 사이클 11b — Homebrew Cask + 거버넌스 + Phase 2 전환 준비

**상태**: Draft (P11b 라운드 반영)
**선행**: 사이클 11a 종료 (electron-builder + release.yml 그린, DMG 빌드 검증 완료, 인계 3건: v0.11.0 tag 실측 / macOS 14·15 본인 검증 / i18next chunk split)
**TDD 정책**: 본진(Homebrew Cask · README · 거버넌스 4종 · Phase 2 체크리스트 · v0.11.0 실측 · macOS 수동 검증)은 빌드/문서/CI 산출물 특성상 사후 테스트 없음. **i18next chunk split만 사후 R1** — Vite manualChunks 적용 후 i18n 동작 회귀 가드. cross-ref: P2-11(`03-cycles.md` 6.5), P2-9(`05-changelog.md` 0.3), 결정 6·7·12(`01-decisions.md`), 0.4 Phase 2 게이트(`05-changelog.md`).

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `Casks/md-dolphin.rb` (별도 repo `bluemirr5/homebrew-md-dolphin`) — `version`, `sha256`, `url "https://github.com/bluemirr5/md_dolphin/releases/download/v#{version}/md_dolphin-#{version}-mac-universal.dmg"`, `name "md_dolphin"`, `desc "macOS markdown viewer"`, `homepage "https://github.com/bluemirr5/md_dolphin"`, `auto_updates false`(P2-11 — 미서명·자동 갱신 부재), `livecheck do url :url; strategy :github_latest; end`, `depends_on macos: ">= :monterey"`(결정 5), `app "md_dolphin.app"`, `zap trash: ["~/Library/Application Support/md_dolphin", "~/Library/Preferences/com.bluemirr5.md-dolphin.plist", "~/Library/Logs/md_dolphin"]`
- [ ] `README.md` 갱신(영문 기본) + `README.ko.md` 신규 — 양 문서 상호 링크. 섹션: ① 개요 ② 설치(DMG 직접 다운로드 + Homebrew Cask 두 경로) ③ **Gatekeeper 우회 안내**(스크린샷 5장: DMG 다운로드 → 더블클릭 마운트 → Applications 드래그 → 우클릭 "열기" → 확인 다이얼로그) ④ **번들 크기·메모리 솔직 표기**(결정 12 — "약 130MB 다운로드, Apple Silicon Mac에서 약 200MB 메모리") ⑤ "왜 이 안내가 필요한가요?"(Apple Developer Program 미가입 솔직 설명, Phase 2 전환 예고) ⑥ **SHA256 검증**(`shasum -a 256 -c SHA256SUMS.txt`) ⑦ 라이선스 / 기여 / 보안 링크
- [ ] `docs/screenshots/install/01-download.png` ~ `05-confirm.png` 신규 — **v0.11.1 DMG 발사 후 본인 환경 1회 캡처**(CR11b-N1 이연: 사이클 11b 안에서 placeholder 주석만, 실제 캡처는 v0.11.1 발사 직후). README는 그동안 텍스트 5단계 + `<!-- TODO -->` 주석으로 자족
- [ ] `LICENSE` 신규 — MIT (auto: 사이클 11b 기본값으로 진행, copyright holder `bluemirr5`)
- [ ] `CONTRIBUTING.md` 신규 — 개발 setup(`pnpm install`, `pnpm dev`, `pnpm test`), 브랜치 전략(main + feature), PR 체크리스트(typecheck/lint/test 그린, 마스터 플랜 정합), 커밋 메시지 한국어 OK 명시
- [ ] `CODE_OF_CONDUCT.md` 신규 — Contributor Covenant 2.1을 **외부 URL 참조 방식으로 채택**(by-reference, CR11b-M3 후향 결정). 연락처 `bluemirr5@gmail.com` 명시 + 공식 URL(https://www.contributor-covenant.org/version/2/1/code_of_conduct/) 링크. 추후 사용자 요청 시 전문 삽입으로 전환 가능
- [ ] `SECURITY.md` 신규 — vulnerability disclosure 채널(`bluemirr5@gmail.com`), 응답 SLA "best effort", 미서명 DMG 한계 명시(결정 6), CVE 처리 정책 placeholder
- [ ] `release/release-notes.template.md` 갱신 — **템플릿만 README 링크로 치환**(`README.md#gatekeeper-bypass` 또는 `README.ko.md#gatekeeper-우회-안내`). v0.11.0 GitHub Releases 노트(11a inline 3줄)는 사후 편집 없이 보존, **v0.11.1 이후 릴리스부터** 템플릿 적용 (P11a-1 시점 충돌 해소)
- [ ] `docs/release/phase2-checklist.md` 신규 — Phase 2(P2-1) 진입 시 작업 순서 7단계 (`05-changelog.md` 0.4): ① Apple Developer Program 가입 ② CSR + Developer ID 인증서 발급 ③ `mac.identity` 설정 + 키체인 통합 ④ `afterSign` 노타라이즈 스크립트(`@electron/notarize`) + entitlements 활성(11a stub) ⑤ 첫 노타라이즈 빌드 + Apple 응답 검증 ⑥ **README Gatekeeper 안내 → 더블클릭 실행 문구로 갱신** ⑦ electron-updater 도입 + Cask `auto_updates: true` 전환. **결정 게이트 시그널 5종 임계치 인라인 인용**(`05-changelog.md` 노타라이즈 전환 결정 게이트 표): (1) 4주 내 `installation-failure` 5건+ (2) 다운로드 200+ 대비 활성 피드백 10건 미만 (3) 인터뷰 포기 30%+ (4) Homebrew 비중 70%+ (5) macOS 정책 변화 1건+. **2개 이상** 관측 시 Phase 2 진입 트리거
- [ ] `.github/PULL_REQUEST_TEMPLATE/cask-auto-updates.md` 신규 — Cask repo의 `auto_updates: false → true` 전환 시 사용. 체크리스트: 노타라이즈 완료 / electron-updater 통합 / 새 DMG 검증 / livecheck 동작 / Cask 정책 정합
- [ ] `electron.vite.config.ts` 또는 `vite.config.ts`(renderer) 갱신 — `build.rollupOptions.output.manualChunks` 추가: `{ i18n: ['i18next', 'react-i18next'] }`. 사이클 11a 베이스라인 index chunk(`out/renderer/assets/index-*.js`) 973KB 대비 ≥30KB 절감 측정(P11a-10 게이트)
- [ ] `docs/release/cycle-11b-bundle-analysis.md` 신규 — 11a 베이스라인 대비 i18n chunk split 적용 후 (a) index chunk 차이 (b) i18n chunk 크기 (c) DMG 크기 영향(0~200KB 예상) (d) react-i18next dynamic import는 효과 <30KB로 사이클 12 인계 명시
- [ ] `docs/plans/03-cycles.md` 6.1 사이클 표 — 사이클 11b 행 산출물 칸에 "Cask 자체 tap / 거버넌스 4종 / README 한·영 / Phase 2 체크리스트 / i18next chunk split / v0.11.0 실측 / v0.11.1 chunk split 릴리스" 1줄
- [ ] `docs/plans/05-changelog.md` 0.1 변경 이력 표 — 사이클 11b 완료 마킹 행 + P11b 라운드 행
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 12 시작 전)**

- [ ] **v0.11.0 결과 기록 확인** — 사이클 11a에서 발사된 v0.11.0 release.yml 그린 + DMG·SHA256SUMS.txt 자산 + 측정값(DMG 크기·빌드 시간·캐시 적중률)이 `docs/release/cycle-11a-build-report.md`에 기록되었음을 확인. 11b에서 v0.11.0을 재발사하지 않음
- [ ] **macOS 14/15 본인 환경 4행 검증** — `cycle-11a-build-report.md`에 표 기록 확인. 12/13은 "결정 5 가정 유지, 검증 미수행" 명시(P11a-3 (b))
- [ ] **v0.11.1 tag 발사** — i18next chunk split 적용 후 사용자 다운로드 가치 확보용. release.yml 그린 + 새 DMG·SHA256SUMS.txt 자산 + `release-notes.template.md` README 링크 적용 첫 릴리스 (P11b-7 architect 권고)
- [ ] **Cask 1회 설치 검증** — `brew tap bluemirr5/md-dolphin && brew install --cask md-dolphin` → `.app` 설치 → 우클릭→열기 정상 실행

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| 사후 R1 | i18next chunk split 회귀 가드 | 기존 i18n 테스트 그린 유지(`initI18n()` ko/en 키 lookup) + `out/renderer/assets/`에 별도 i18n 청크 파일 생성 확인(rollup 출력 1줄 검증 — `i18n-*.js` 산출물 존재) |
| 사후 | Cask · README · 거버넌스 4종 · Phase 2 체크리스트 · v0.11.0 실측 · macOS 수동 검증 · 번들 분석 · v0.11.1 발사 | AC1·AC2·AC3·AC4·AC5·AC6·AC7·AC8 — 빌드/문서/CI 산출물 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | Cask 정의(`Casks/md-dolphin.rb`) — `brew style Casks/md-dolphin.rb` 통과 + `brew install --cask` 1회 그린(미서명이라 사용자 우클릭→열기 별도). `auto_updates false` + `livecheck github_latest` + `depends_on macos: ">= :monterey"` 모두 명시 | `brew style` + 본인 환경 1회 설치 |
| AC2 | `README.md` + `README.ko.md` 양쪽 존재 + 스크린샷 5장(`docs/screenshots/install/0[1-5]-*.png`) + 번들 크기·메모리 솔직 표기(결정 12) + SHA256 검증 명령 + "왜 안내 필요" 섹션 | 파일 존재 + grep `130MB`, `200MB`, `shasum -a 256` |
| AC3 | 거버넌스 4종 모두 존재 — `LICENSE`(MIT) / `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md`(Contributor Covenant 2.1 본문) / `SECURITY.md`. 연락처 `bluemirr5@gmail.com` 치환 확인 | 파일 존재 + grep `Contributor Covenant`, `MIT License`, `bluemirr5@gmail.com` |
| AC4 | 사이클 11a v0.11.0 발사 결과 `docs/release/cycle-11a-build-report.md` 기록 확인 — release.yml 그린 + DMG 크기 ≤ 130MB(11a AC5) + 빌드 시간 ≤ 30분(11a AC4) 실측 표 존재. 11b에서 재발사 없음 | 보고서 표 grep `DMG size`, `build time` |
| AC5 | macOS 14/15 본인 환경 4행 검증 표가 `cycle-11a-build-report.md`에 기록됨 (a) DMG 마운트 (b) Applications 드래그 (c) 첫 실행 우클릭→열기 (d) `.md` 더블클릭 → 본 앱 열림. 12/13은 "결정 5 가정 유지, 검증 미수행" 명시 | 보고서 표 grep |
| AC6 | i18next chunk split 적용 후 사이클 11a baseline index chunk(`out/renderer/assets/index-*.js`) 973KB 대비 ≥ 30KB 절감 측정 + `cycle-11b-bundle-analysis.md` diff 표 + i18n 테스트 회귀 0 | `pnpm build` 산출물 비교 + pnpm test 그린 |
| AC7 | `phase2-checklist.md` + `.github/PULL_REQUEST_TEMPLATE/cask-auto-updates.md` 존재 + **결정 게이트 시그널 5종 임계치 인라인 인용** (4주 5건+ / 200+ vs 10건 미만 / 30%+ / 70%+ / 1건+) + "2개 이상" 트리거 명시 | 파일 존재 + grep `installation-failure`, `5건`, `2개 이상`, `auto_updates: true` |
| AC8 | v0.11.1 tag 발사 — release.yml 그린 + i18next chunk split 적용 빌드 + `release-notes.template.md` README 링크 적용 첫 릴리스 + `cycle-11a-build-report.md` v0.11.1 행 추가 | GitHub Releases v0.11.1 자산 + 보고서 행 |

---

## 설계 제약

- **Cask 자체 tap 우선 (P2-11)**: 공식 `homebrew/cask` PR은 노타라이즈 전 대기열 차단 가능성 — Phase 1은 `bluemirr5/homebrew-md-dolphin` 별도 repo만 운영. Phase 2 노타라이즈 후 공식 cask PR 검토 (체크리스트에 포함)
- **스크린샷 5장 placeholder 캡처 정책**: v0.11.0 DMG 빌드 후 본인 macOS 환경에서 1회 캡처. 다른 OS 버전 캡처는 사용자 리포트 발생 시 보강 — 환경 한계 README 하단 1줄로 솔직 기재(결정 12 정합)
- **i18next chunk split만 즉시 적용 (P11a-10)**: 11a 베이스라인 +98.3KB 회귀 중 ≥30KB 절감 후보만. 측정 단위는 **index chunk(`out/renderer/assets/index-*.js`)** — 사이클 11a 973KB 베이스라인. react-i18next dynamic import는 효과 <30KB + bootstrap 구조 변경 위험 → 사이클 12 인계. iconv-lite는 main 전용 격리 이미 적용됨(11a 분석)
- **release-notes 치환 시점 명료화 (P11b-6)**: v0.11.0 GitHub Releases 노트(11a inline 3줄)는 **사후 편집 없이 그대로 보존** — `release-notes.template.md` 템플릿만 README 링크로 치환하여 **v0.11.1 이후 릴리스부터 적용**. 11a P11a-1과의 시점 충돌 해소
- **v0.11.1 발사를 11b 완비에 포함 (P11b-7)**: chunk split 결과가 사용자 다운로드 자산에 들어가야 가치가 있으므로 architect 권고에 따라 v0.11.1 tag을 11b 안에서 발사. 11a v0.11.0은 재발사하지 않음
- **MIT 라이선스 기본값 (auto)**: copyright holder `bluemirr5`. 다른 OSI 라이선스 검토는 추후 사용자 요청 시 변경 — 사이클 11b는 "공개 가능"이 우선
- **macOS 분기 (P2-9)**: Cask 정의·README·거버넌스 모두 OS 분기 코드 신규 0건. `process.platform` 직참조 0건. `src/shared/platform.ts` 변경 없음
- **i18n 영향**: `README.ko.md` 별도 정적 문서로 신규. `src/shared/locales/*.json` 신규 키 0건 — 앱 UI는 사이클 10 i18n 토대 그대로
- **보안 영향**: `SECURITY.md` 신규로 vulnerability disclosure 채널 명시. IPC 표면 변경 0, CSP 영향 0, 화이트리스트 변경 0(P3-1)
- **성능 회귀 게이트**: i18next chunk split만 측정 — index chunk 차이 + i18n chunk 크기 비교. 1만 줄 회귀 게이트(P2-5) 미적용(빌드/문서 사이클). DMG 크기 ≤ 130MB는 11a 실측에서 검증 완료
- **Phase 2 전환 트리거 (P11b-1)**: `phase2-checklist.md`는 Phase 2 진입 시 사용할 체크리스트만 작성, 본 사이클은 Phase 1 종료 마커. 결정 게이트 5종 임계치(4주 5건+ / 200+ vs 10건 미만 / 30%+ / 70%+ / 1건+)는 본문 재서술 없이 `05-changelog.md` 노타라이즈 전환 결정 게이트 표 cross-reference + 숫자만 인용

---

## 신규 의존성

없음. Cask repo는 별도 GitHub repo, Vite manualChunks는 기존 Vite 설정 옵션.

---

## 미룬 것

- 사이클 12: react-i18next dynamic import (효과 <30KB), shiki dual theme 커스텀 JSON 검토(사이클 9 인계), AC3b/c 콜드 스타트·메모리 수동 측정(사이클 9 인계), 공식 `homebrew/cask` PR 제출 검토(노타라이즈 후)
- Phase 2 (0.4 사이클 P2-1): Apple Developer Program 가입 + 노타라이즈 + electron-updater + Cask `auto_updates: true` 전환 + entitlements 활성(11a stub plist) + README "더블클릭 실행" 문구 갱신
- 기타: macOS 12/13 UTM/VM 검증(P11a-3 (a) 사용자 리포트 발생 시), DMG 배경 이미지 커스텀 디자인, 다국어 README 추가(일·중)

---

## Open Questions

없음. 사이클 11a Q1은 P11a-7로 해소.

---

## 변경 이력

| 일자 | 라운드 | 항목 | 반영 |
|------|--------|------|------|
| 2026-05-01 | P11b-1 ★ | Phase 2 결정 게이트 시그널 5종 임계치 인라인 인용 | DoD A `phase2-checklist.md` + AC7 검증 칸에 5종 수치(4주 5건+ / 200+ vs 10건 미만 / 30%+ / 70%+ / 1건+) + "2개 이상" 트리거 명시. `05-changelog.md` cross-ref 유지 |
| 2026-05-01 | P11b-4 | i18next chunk split 측정 베이스라인 명시 | AC6 + 설계 제약 + DoD: "initial bundle"을 "index chunk(`out/renderer/assets/index-*.js`) — 11a 973KB 베이스라인"으로 치환 |
| 2026-05-01 | P11b-5 | 사후 R1 핵심 칸 자족성 보강 | TDD 표 R1 칸에 "rollup 출력 1줄 검증 — `i18n-*.js` 산출물 존재" 추가 |
| 2026-05-01 | P11b-6 | release-notes 치환 시점 명료화 | DoD A `release-notes.template.md` 항목 + 설계 제약: v0.11.0 노트는 보존, 템플릿만 README 링크로 치환하여 v0.11.1 이후 적용 (11a P11a-1 충돌 해소) |
| 2026-05-01 | P11b-7 | 작업량 한정 + v0.11.1 발사 권고 | DoD B + AC4·AC5: 11a v0.11.0 재발사 없음 명시. AC8 신설 — v0.11.1 tag 발사를 11b 완비에 포함 |
| 2026-05-01 | P11b-2/3 | 권고 검증 (인용 정확성·DoD 표현 일관성) | 본문 변경 없음, 검토 완료 — 5종 게이트 표 인용 정확, DoD 7단계 0.4 정합 |
| 2026-05-01 | findings | `phase2-checklist.md` 6단계 README 갱신 항목 추가 | DoD A 7단계 ⑥에 "README Gatekeeper 안내 → 더블클릭 실행 문구로 갱신" 1줄 추가 (0.4 7단계 정합) |
| 2026-05-01 | CR11b-M1 | Cask sha256 `:no_check` 임시 적용 | `homebrew-tap/Casks/md-dolphin.rb` `sha256` placeholder hex → `:no_check`로 교체 (`brew style` 통과). v0.11.1 발사 후 실측 hex로 치환 |
| 2026-05-01 | CR11b-M2 | 번들 절감량 수치 정정 | base-10 단위 통일: 881KB index chunk + -92KB 절감으로 `bundle-analysis.md` / `03-cycles.md` / `05-changelog.md` 일괄 정정 |
| 2026-05-01 | CR11b-M3 | CODE_OF_CONDUCT.md by-reference 채택 | DoD A "본문 그대로" → "외부 URL 참조 방식 채택". 전문 삽입은 추후 사용자 요청 시 전환. AC3 검증은 외부 URL 참조 + 연락처 grep로 충족 |
| 2026-05-01 | CR11b-N1 | 스크린샷 캡처를 v0.11.1 발사 후로 이연 | DoD A 스크린샷 항목: v0.11.0 → v0.11.1 발사 후 캡처. 11b는 placeholder 주석만 |
| 2026-05-01 | CR11b-N2 | README.ko.md Phase 2 체크리스트 링크 추가 | 한·영 정합 |
| 2026-05-01 | CR11b-N4 | Cask livecheck `url :url` → `url :homepage` | Homebrew 공식 권장 패턴. `brew audit` 권고 정합 |
