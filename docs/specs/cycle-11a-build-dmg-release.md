# 사이클 11a — OSS 배포: 빌드 + DMG + GitHub Releases

**상태**: Completed (2026-05-01, P11a 10건 + CR11a 7건 흡수, 사이클 11b 인계 3건)
**선행**: 사이클 10 커밋 `830b274` 그린 (413 tests, 회귀 p50 4.31ms, 인계 부채 9건)
**TDD 정책**: 본진(electron-builder · CI 워크플로 · macOS 4버전 수동 검증)은 빌드/CI 파이프라인 특성상 사후 테스트 없음. 부채 처리(zoom-bridge dispose · ErrorState a11y i18n)는 **사후 R1/R2**로 분류 — CR10 부채 회귀 보강 목적, red→green→refactor 순서 강제 없음. cross-ref: P2-10(`03-cycles.md` 6.4), 결정 6·12(`01-decisions.md`), 사이클 표(`03-cycles.md` 6.1).

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `electron-builder.yml` 신규 — `appId: com.bluemirr5.md-dolphin`, `productName: md_dolphin`, `directories.output: release/`, `mac.target: dmg`, `mac.arch: ['x64', 'arm64']` (Universal Binary), `mac.category: public.app-category.productivity`, `mac.identity: null` (서명 비활성), `mac.extendInfo.CFBundleDocumentTypes: [{ CFBundleTypeName: 'Markdown', CFBundleTypeExtensions: ['md', 'markdown'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Default' }]`, `dmg.title: 'md_dolphin ${version}'`, `dmg.contents: [{x:130,y:220,type:'file'},{x:410,y:220,type:'link',path:'/Applications'}]`, `compression: maximum`, `artifactName: 'md_dolphin-${version}-mac-universal.${ext}'`. **`mac.entitlements` 키는 미설정**(P11a-2 차단 해소 — stub plist 미참조)
- [ ] `package.json` 갱신 — script `dist: electron-vite build && electron-builder --mac dmg --universal`, `dist:checksum: shasum -a 256 release/*.dmg > release/SHA256SUMS.txt`. devDependency `electron-builder ^26.x` 추가
- [ ] `build/entitlements.mac.plist` 신규 — **사이클 11a에서는 작성만 하고 `electron-builder.yml`에서 참조하지 않음**(P11a-2). 빈 dict + 주석: `<!-- Phase 2 P2-1에서 electron-builder.yml의 mac.entitlements: build/entitlements.mac.plist로 활성. 현 사이클은 미서명 빌드라 hardened runtime 미사용 — 자리잡이 stub -->`. 미참조 stub은 빌드 conflict 0
- [ ] `.github/workflows/release.yml` 신규 — 트리거 `push.tags: ['v*.*.*']`, 러너 `macos-14`, 단계: ① actions/checkout@v4 ② actions/setup-node@v4 (node 20) ③ pnpm/action-setup@v4 ④ `pnpm install --frozen-lockfile` **⑤ actions/cache@v4 — `~/.pnpm-store` (key: `pnpm-${{ hashFiles('pnpm-lock.yaml') }}`) + `~/Library/Caches/electron` (key: `electron-${{ hashFiles('package.json') }}`)** (P11a-5) ⑥ `pnpm typecheck && pnpm lint && pnpm test` ⑦ `pnpm dist` (시작·종료 timestamp 출력) ⑧ `pnpm dist:checksum` ⑨ softprops/action-gh-release@v2 — DMG + SHA256SUMS.txt 첨부, body는 `release/release-notes.md` 사용
- [ ] `.github/workflows/ci.yml` 갱신 또는 신규 — PR마다 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (DMG 미생성, 5분 이내). release.yml과 분리해 빌드 시간 가산 회피
- [ ] `release/release-notes.template.md` 신규 — `## md_dolphin ${version}`, 변경 요약 placeholder, "DMG SHA256" 검증 명령(`shasum -a 256 md_dolphin-${version}-mac-universal.dmg`). **Gatekeeper 우회 안내는 11b 미공개 시점에 inline 3줄로 자족 표기**(P11a-1): `1) Finder에서 .app 우클릭 2) "열기" 메뉴 선택 3) 확인 다이얼로그에서 "열기" 클릭`. 사이클 11b 머지 후 README 링크로 치환
- [ ] `docs/release/cycle-11a-build-report.md` 신규 — DMG 크기·SHA256·빌드 시간(로컬 macos-14 가정 + GitHub Actions 실측)·**macOS 14/15 본인 환경 의무 + 12/13는 결정 5 가정 유지(검증 미수행)**(P11a-3 (b) auto 채택). codesign ad-hoc sign 발생 여부, 캐시 적중률, 환경 한계도 솔직 기재(결정 12 정합)
- [ ] `src/renderer/src/zoom-bridge.ts` 갱신 — `initZoomBridge()` 반환값을 `() => void` cleanup으로 변경(현재 dispose 미저장, CR10-6). IPC `onZoomChanged` 리스너 해제(DOM 이벤트는 main의 zoom-ipc + 메뉴가 처리하므로 renderer DOM 리스너 없음)
- [ ] `src/renderer/src/main.tsx` 또는 `App.tsx` 갱신 — `useEffect(() => initZoomBridge(), [])` 패턴으로 cleanup return. unmount 시 dispose 호출 보장
- [ ] `src/renderer/src/zoom-bridge.ts` + `src/main/menu.ts` 정합 — `ZOOM_STEP` 단일 상수를 `src/shared/zoom.ts`로 이동(`export const ZOOM_STEP = 0.5; export const ZOOM_MIN = -3; export const ZOOM_MAX = 3;`). 양측 import 통일(CR10-7)
- [ ] `src/renderer/src/components/ErrorState.tsx` 갱신 — `aria-label`도 `t('errors.<kind>.ariaLabel')` 키로 치환(CR10-9). `src/shared/locales/ko.json`·`en.json`에 `errors.*.ariaLabel` 5종 추가
- [ ] `src/main/file-service.ts` 갱신 — `too-large` 분기를 `stat → size 검사 → read 진입 전 early return`으로 명시적 단계 주석 추가(CR10-1). 변경 없이 가드 주석 1블록만 — 동작 회귀 0
- [ ] `src/main/file-service.ts` 또는 `src/shared/file-error.ts` — `FileErrorKind` 'encoding'에 `// 안전망: iconv 후보 모두 실패 시 'not-markdown'으로 대체되므로 production에서 도달 불가. type exhaustiveness 보존용` 주석 추가(CR10-10)
- [ ] `src/renderer/src/components/useScrollSpy.ts` 점검 — `suspendUntil`/`pendingTarget` useRef 전환(CR10-5에서 완료) 상태 유지 확인 + IO deps 배열에 누락 없음 회귀 가드 주석 1줄(CR10-12). **CR10-5 즉시 수정 시 추가된 Observer 재생성 spy 테스트가 본 사이클에서도 그린 유지(회귀 가드, 신규 테스트 불요)**(P11a-9)
- [ ] `scripts/verify-prod-bundle.mjs` 갱신 — grep 대상 배열 위에 주석 블록 추가: `// dev-only 코드가 production 번들에 포함되지 않는지 검증. axe-core(@axe-core/react dev import), bench:cold-start(IPC dev guard), bench:render(IPC dev guard) — 모두 NODE_ENV !== 'production' 가드를 통과해 tree-shake되어야 함` (CR10-11)
- [ ] `docs/plans/03-cycles.md` 6.1 사이클 표 — 사이클 10 행 비고에 "i18next v26.x / react-i18next v17.x 실설치 채택(스펙 ^23/^14에서 메이저 갱신, CR10-8 처리)" 1줄 추가. `docs/specs/cycle-10-error-a11y-i18n.md` 신규 의존성 블록도 v26/v17로 갱신
- [ ] `docs/release/cycle-11a-bundle-analysis.md` 신규 — `pnpm vite build`(electron-vite renderer 단계) 결과 `dist/renderer/assets/` 합산 크기 + 사이클 9 베이스라인 대비 +98.3KB 회귀 분석. **분할 1건당 예상 절감 ≥ 30KB이면 11b 즉시 적용 후보, 미만이면 사이클 12 인계**(P11a-10) — 분할 후보 3건 검토(i18next chunk split / react-i18next dynamic import / iconv-lite main 전용 격리 효과 재확인). **분석 + 보고 1회**, 실제 분할 적용은 사이클 11b 또는 12로 인계
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 11b 시작 전)**

- [ ] tag `v0.11.0` push → GitHub Actions release 워크플로 1회 실측 → DMG 자산 첨부 확인
- [ ] DMG 크기 ≤ 130MB(결정 12 솔직 표기 게이트), 빌드 시간 ≤ 30분(P2-10 게이트). 초과 시 `docs/release/cycle-11a-build-report.md`에 (a) arm64 우선 (b) `compression: store` (c) ICU 제거 중 적용한 옵션 기록
- [ ] macOS 14/15 본인 환경 4행 채워진 보고서. 12/13은 "결정 5 최소 버전 가정 유지, 검증 미수행" 명시 (P11a-3 (b))

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| 사후 R1 | `zoom-bridge.ts` cleanup return (CR10-6 부채 회귀 보강) | `initZoomBridge()` 호출 → cleanup 함수 반환 → cleanup 호출 시 IPC 리스너 해제 검증 (DOM 이벤트는 main zoom-ipc + 메뉴가 처리) |
| 사후 R2 | `ErrorState.tsx` aria-label i18n (CR10-9 부채 회귀 보강) | ko/en locale에서 `aria-label` 값이 `t('errors.<kind>.ariaLabel')` 결과와 일치 (RTL 5종 kind) |
| 사후 | electron-builder 설정 · release.yml · 빌드 시간 측정 · macOS 4버전 검증 · 번들 분석 보고 · CR10-1/7/10/11/12 주석성 부채 | AC1·AC3·AC4·AC5·AC6·AC8·AC9 — 빌드/CI/문서 산출물 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `pnpm dist` 로컬 실행 시 `release/md_dolphin-${version}-mac-universal.dmg` 생성, Universal Binary(x64+arm64), `mac.identity: null` 미서명. **`codesign -dv release/mac-universal/md_dolphin.app` 결과가 `code object is not signed at all` 단언**(P11a-4). ad-hoc sign 발생 시 보고서 명시 | 로컬 1회 (cli `file ...` → "Mach-O universal binary with 2 architectures" + `codesign -dv` 미서명 확인) |
| AC2 | `pnpm dist:checksum` 실행 시 `release/SHA256SUMS.txt` 생성, `shasum -a 256 -c` 검증 통과 | 로컬 1회 |
| AC3 | tag `v0.11.0` push → GitHub Actions release 워크플로 그린, DMG + SHA256SUMS.txt가 GitHub Releases에 자산으로 첨부. **release-notes만으로 첫 실행 가능(11a 단독 릴리스 시점)**(P11a-1) | GitHub Actions 1회 실측 + release 페이지 수동 확인 |
| AC4 | release 워크플로 step "pnpm dist" duration ≤ 30분(P2-10 게이트). 초과 시 보고서에 적용 옵션 + **캐시 적중률** 기록(P11a-5) | GitHub Actions step duration |
| AC5 | DMG 크기 ≤ 130MB(결정 12). 초과 시 `compression: store` 회피 또는 보고서 사유 명시 | `ls -lh release/*.dmg` |
| AC6 | macOS **14/15 본인 환경 의무**, 12/13은 "결정 5 가정 유지, 검증 미수행"(P11a-3 (b)). (a) DMG 마운트 (b) Applications 드래그 (c) 첫 실행 우클릭→열기 (d) `.md` 파일 더블클릭 → 본 앱으로 열림 — **2×4 매트릭스 모두 성공**. (d)는 **다른 마크다운 앱 미설치 환경 가정**(P11a-8 한계) | 수동 1회, 보고서 표에 기록 |
| AC7 | `initZoomBridge()` 반환 cleanup을 호출하면 `onZoomChanged` IPC 리스너 해제(spy로 listener 해제 확인). App unmount 시 cleanup 자동 호출(CR10-6). **CR10-5 useScrollSpy Observer 재생성 spy 테스트도 그린 유지**(P11a-9) | pnpm test RTL |
| AC8 | `ErrorState` 5종 kind 모두 ko/en locale에서 `aria-label`이 i18n 키 결과로 렌더, 한국어 하드코딩 0건(CR10-9). `getByLabelText`로 5종 단언 | pnpm test RTL |
| AC9 | `docs/release/cycle-11a-bundle-analysis.md` 존재 + 사이클 9 베이스라인 대비 +98.3KB 회귀 분석 + 분할 후보 3건 평가. **권고 표 1행/후보 — ≥30KB 절감 후보는 11b 즉시 적용, 미만은 사이클 12 인계**(P11a-10) | 문서 존재 + diff 표 + 권고 표 |

---

## 설계 제약

- **electron-builder 단일 설정 파일**: `electron-builder.yml`로 분리(package.json 인라인 회피) — main.ts/preload 빌드와 분리해 diff 가독성 + electron-vite 빌드 산출물(`out/main`, `out/preload`, `out/renderer`)을 그대로 packager 입력으로 사용 (electron-vite 표준 레이아웃)
- **미서명 DMG 명시 (결정 6)**: `mac.identity: null`로 서명 비활성. **`mac.entitlements` 키 미설정** — entitlements.plist는 stub만 두고 미참조(P11a-2 차단 해소). hardened runtime 미사용 — 노타라이즈 전환(0.4 사이클 P2-1) 대비 자리잡이. CFBundleDocumentTypes만 사이클 3 `.md` 연결과 정합. `LSHandlerRank: 'Default'`(P11a-8 — 신규 사용자 우선, 다른 마크다운 앱 미설치 환경 가정)
- **GitHub Actions 러너 macos-14 (Apple Silicon)**: arm64 네이티브 + Universal Binary로 x64 후처리. macos-12/13 러너는 deprecation 경로라 회피. CI 시간 30분 게이트 초과 시 P2-10 (a)(b)(c) 순서로 보고서에 적용 옵션 기록. **actions/cache@v4로 pnpm-store + electron Cache 적중**(P11a-5)
- **release/ci 워크플로 분리**: PR CI는 `pnpm build`만(DMG 미생성), tag push만 release 워크플로 실행 — PR마다 30분 빌드 회피. ci.yml은 5분 이내 목표
- **번들 분석은 분석만, 실제 분할은 미룸**: +98.3KB 회귀를 사이클 11a에서 즉시 수정하면 본진 빌드/배포 작업과 충돌. 분석 보고 + 후속 사이클 권고로 분리 — 결정 12 "솔직 표기" 기조와 정합 (당장 130MB 다운로드 게이트는 통과). **분할 1건당 ≥30KB 절감 후보만 11b 즉시 적용**(P11a-10)
- **부채 9건 분류**: 코드 수정 동반(CR10-6 cleanup, CR10-7 상수 통일, CR10-9 a11y i18n)은 사후 R1/R2 회귀 보강. 주석/문서성(CR10-1, CR10-10, CR10-11, CR10-12)은 회귀 가드 주석만 추가, 별도 테스트 불요. CR10-8은 스펙·플랜 문서 갱신만(코드는 v26/v17이 이미 동작 중). CR10-12 회귀 가드는 CR10-5 즉시 수정 테스트가 그린 유지로 충분(P11a-9)
- **macOS 분기 (P2-9)**: electron-builder 설정 자체가 macOS-only(`mac.*` 키만 사용). `process.platform === 'darwin'` 신규 직참조 0건, `src/shared/platform.ts` 변경 없음. release.yml 러너도 `macos-14` 단일
- **macOS 12/13 검증 한계 (P11a-3)**: 본인 환경 14/15만 의무. 12/13은 (b) "결정 5 최소 버전 가정 유지, 검증 미수행" 채택 — 보고서에 환경 한계 솔직 기재(결정 12 정합). 향후 사용자 리포트 기반 보강
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — 빌드/CI 실패 시 GitHub Actions 로그가 단일 진실원, 사용자 노출 에러 신규 0. 접근성 — CR10-9 ErrorState aria-label i18n 외 본진 변경 없음. i18n — `errors.*.ariaLabel` 5키 추가 외 신규 키 없음. 보안 — 미서명 DMG(결정 6)·entitlements stub 미참조·CFBundleDocumentTypes 화이트리스트(`md`,`markdown`만) — IPC 표면 변경 0, CSP 영향 0. macOS — 분기 신규 0(상기). 성능 회귀 — **해당 없음**(빌드/CI 사이클, 1만 줄 회귀 게이트 미적용). 단 DMG 크기 ≤ 130MB(AC5) + 빌드 시간 ≤ 30분(AC4) 별도 게이트로 운영. 로컬 자산 — 영향 없음
- **사후 라운드 이월 금지**: AC1~AC9는 본 사이클 안에 종결. 번들 분할(AC9 권고분)만 사이클 11b/12로 인계 — 분석 보고서가 명확한 인계 경계

---

## 신규 의존성

```json
{
  "devDependencies": {
    "electron-builder": "^26.x"
  }
}
```

런타임 의존성 0. electron-builder는 빌드 타임만 사용.

---

## 미룬 것

- 사이클 11b: Homebrew Cask(`yourname/homebrew-md-dolphin`), README Gatekeeper 우회 안내(스크린샷 5장 — release-notes inline 3줄에서 링크 치환), 4개 거버넌스 문서(LICENSE/CONTRIBUTING/CODE_OF_CONDUCT/SECURITY), 번들 크기 안내 README, Phase 2 노타라이즈 전환 체크리스트 (P2-11 본진)
- 사이클 12 또는 11b: renderer initial bundle +98.3KB 실제 분할 적용 (i18next chunk split / react-i18next lazy / iconv-lite main 격리 재확인 — ≥30KB 절감 후보만 11b, 미만은 사이클 12)
- Phase 2 (0.4 사이클 P2-1): Apple Developer Program 가입 + 노타라이즈 + hardened runtime entitlements(11a stub plist 활성) + electron-updater 자동 갱신 + Cask `auto_updates: true` 전환
- 기타: x64 단독 릴리스 분리 워크플로(P2-10 옵션 a 적용 시), arm64 우선 첫 릴리스 후 x64 후속 자동화, DMG 배경 이미지 커스텀 디자인, ICU 데이터 제거 빌드(P2-10 옵션 c), macOS 12/13 UTM/VM 검증(P11a-3 (a) 사용자 리포트 발생 시)

---

## Open Questions

- ~~Q1: tag `v0.11.0` 첫 릴리스를 사이클 11a 안에서 발사할지 vs 사이클 11b 종료 후 함께 발사할지~~ — **해소(P11a-1과 합류, P11a-7)**: **11a 안 발사** + release-notes inline 3줄 자족 안내. 11b 머지 후 README 링크로 치환

---

## 변경 이력

| 일자 | 라운드 | 항목 | 반영 |
|------|--------|------|------|
| 2026-05-01 | - | 초안 작성 | spec-writer 1차 |
| 2026-05-01 | P11a-1 | release-notes 자족 안내 | DoD release-notes.template.md 항목 inline 3줄 + AC3 1줄 추가 |
| 2026-05-01 | P11a-2 ★ | entitlements 키 미설정 (차단 해소) | electron-builder.yml에서 `mac.entitlements` 키 미설정, stub plist만 작성 + Phase 2 P2-1 자리잡이 주석. 설계 제약 "미서명 DMG"에 한 줄 추가 |
| 2026-05-01 | P11a-3 | macOS 12/13 검증 현실성 | AC6를 14/15 본인 환경 의무로 축소, 12/13은 (b) 채택 — "결정 5 가정 유지, 검증 미수행" 보고서 명시. 설계 제약 추가 |
| 2026-05-01 | P11a-4 | Universal + ad-hoc sign 검증 | AC1에 `codesign -dv` "code object is not signed at all" 단언 + ad-hoc sign 발생 시 보고서 명시 추가 |
| 2026-05-01 | P11a-5 | release.yml 캐시 단계 추가 | DoD release.yml 단계 ⑤에 `actions/cache@v4` (`~/.pnpm-store` + `~/Library/Caches/electron`) + AC4 미달 시 "캐시 적중률" 보고서 1줄 |
| 2026-05-01 | P11a-6 | TDD R1/R2 사후 분류 통일 | TDD 정책 헤더 + 표 R1/R2를 "사후 R1/R2"로 명명, CR10 부채 회귀 보강임을 명시 |
| 2026-05-01 | P11a-7 | Open Question Q1 해소 | Q1을 "해소(P11a-1과 합류)"로 마킹 보존 — 11a 안 발사 + release-notes 자족 |
| 2026-05-01 | P11a-8 | LSHandlerRank 의도 | DoD electron-builder.yml의 `LSHandlerRank: 'Default'` 채택 (신규 사용자 우선) + AC6 (d)에 "다른 마크다운 앱 미설치 환경 가정" 한계 명시 |
| 2026-05-01 | P11a-9 | CR10-12 검증 누락 | DoD useScrollSpy 항목 + AC7에 "CR10-5 Observer 재생성 spy 테스트가 본 사이클 그린 유지(회귀 가드, 신규 테스트 불요)" 1줄 |
| 2026-05-01 | P11a-10 | 번들 분석 평가 기준 | DoD bundle-analysis.md 항목 + AC9 검증 칸에 "분할 1건당 예상 절감 ≥30KB이면 11b 즉시 적용 후보, 미만이면 사이클 12 인계" + 권고 표 1행/후보 |
| 2026-05-01 | CR11a-2 | electron-builder 버전 정합 | 실설치 ^26.8.1 채택, 스펙 ^25.x → ^26.x 갱신 (CR10-8 패턴) |
| 2026-05-01 | CR11a-4 | zoom-bridge DOM 리스너 표기 정정 | 스펙 DoD/AC7/TDD R1에서 wheel/keydown 언급 제거. main이 처리하는 구조 1줄 사유 |
