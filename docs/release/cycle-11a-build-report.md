# 사이클 11a 빌드 리포트

**버전**: v0.11.0  
**작성일**: 실측 시 채울 것 (v0.11.0 tag push 후)  
**빌드 환경**: 로컬 macOS 14 (가정) + GitHub Actions macos-14 러너 실측

---

## 빌드 산출물

| 항목 | 값 |
|------|-----|
| DMG 파일명 | `md_dolphin-0.11.0-mac-universal.dmg` |
| DMG 크기 | (실측 후 채울 것: `ls -lh release/*.dmg`) |
| SHA256 | (실측 후 채울 것: `shasum -a 256 release/*.dmg`) |
| Universal Binary 확인 | (실측: `file release/mac-universal/md_dolphin.app/...`) |
| codesign 결과 | (실측: `codesign -dv release/mac-universal/md_dolphin.app` → "code object is not signed at all" 또는 ad-hoc sign 발생 여부) |

---

## 빌드 시간 (AC4: ≤ 30분 게이트)

| 환경 | pnpm dist 시간 | 캐시 적중 여부 |
|------|--------------|--------------|
| 로컬 macOS 14 (첫 실행) | (실측) | - |
| GitHub Actions macos-14 (캐시 cold) | (실측) | miss |
| GitHub Actions macos-14 (캐시 warm) | (실측) | hit |

캐시 적중률: (실측 후 채울 것)

### 30분 초과 시 적용 옵션 (P2-10)
- (a) arm64 우선 단독 릴리스 (x64 후속)
- (b) `compression: store` (크기 대신 속도)
- (c) ICU 데이터 제거 빌드

---

## macOS 호환성 검증 (AC6: 14/15 의무, 12/13 결정 5 가정)

| macOS 버전 | (a) DMG 마운트 | (b) Applications 드래그 | (c) 첫 실행 우클릭→열기 | (d) .md 더블클릭 |
|-----------|-------------|---------------------|---------------------|----------------|
| 14 (Sonoma) | (실측) | (실측) | (실측) | (실측) |
| 15 (Sequoia) | (실측) | (실측) | (실측) | (실측) |
| 13 (Ventura) | 검증 미수행 — 결정 5 최소 버전 가정 유지 | - | - | - |
| 12 (Monterey) | 검증 미수행 — 결정 5 최소 버전 가정 유지 | - | - | - |

**한계 명시**: macOS 12/13은 본인 환경 미보유로 검증 불가. 사용자 리포트 발생 시 사이클 12에서 보강.  
(d) `.md` 더블클릭 검증은 다른 마크다운 앱 미설치 환경에서만 유효 (P11a-8 한계).

---

## 서명 상태

`mac.identity: null` 설정으로 코드 서명 비활성. codesign ad-hoc sign 발생 여부:

- ad-hoc sign 발생: (실측 후 기록)
- `codesign -dv` 출력: (실측 후 기록)

Phase 2 (P2-1)에서 Apple Developer Program 가입 후 hardened runtime + 노타라이즈로 전환 예정.  
`build/entitlements.mac.plist`는 Phase 2 활성 시 `electron-builder.yml`의 `mac.entitlements`에 참조.

---

## 환경 한계

- 본인 환경 macOS 14/15만 검증 의무, 12/13은 "결정 5 최소 버전 가정 유지"
- `pnpm dist` 로컬 실행은 본 사이클에서 미실행 — v0.11.0 tag push 시 GitHub Actions에서 실측 예정
- 번들 분석: `docs/release/cycle-11a-bundle-analysis.md` 참조
