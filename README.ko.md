# md_dolphin

macOS용 마크다운 뷰어 — Electron 기반, 로컬 우선, 개발자가 아닌 사용자를 위해 설계되었습니다.

[English README](./README.md)

---

## 개요

md_dolphin은 macOS에서 `.md` 파일을 깔끔한 독서 환경으로 엽니다. Electron 기반(결정 1)으로 macOS 12 이상에서 추가 런타임 없이 안정적으로 실행됩니다. 네이티브 앱보다 다운로드 크기가 크지만(결정 12), 별도 설치 없이 바로 사용 가능합니다.

---

## 설치

### 방법 1 — DMG 직접 다운로드

1. [GitHub Releases](https://github.com/bluemirr5/md_dolphin/releases)로 이동합니다.
2. `md_dolphin-<버전>-mac-universal.dmg`를 다운로드합니다.
3. DMG를 열고 `md_dolphin.app`을 `/Applications` 폴더로 드래그합니다.
4. 처음 실행 시 아래 [Gatekeeper 우회 안내](#gatekeeper-우회-안내)를 따르세요.

### 방법 2 — Homebrew Cask

> 참고: Cask는 공식 `homebrew/cask`가 아닌 커스텀 탭(`bluemirr5/homebrew-md-dolphin`)에 배포됩니다. 공식 등록은 코드 서명(Phase 2) 이후 검토 예정입니다.

```bash
brew tap bluemirr5/md-dolphin
brew install --cask md-dolphin
```

설치 후 처음 실행 시 아래 [Gatekeeper 우회 안내](#gatekeeper-우회-안내)를 따르세요.

---

## Gatekeeper 우회 안내

md_dolphin은 Apple 코드 서명 없이 배포됩니다(결정 6 — Apple Developer Program 미가입). macOS Gatekeeper가 처음 실행을 차단합니다. 아래 절차를 따라주세요.

<!-- TODO: v0.11.1 빌드 후 캡처 → docs/screenshots/install/01-download.png 등 5장 추가 -->

**1단계 — DMG 다운로드**

[GitHub Releases](https://github.com/bluemirr5/md_dolphin/releases)에서 다운로드합니다.

_스크린샷 자리: `docs/screenshots/install/01-download.png`_

**2단계 — DMG 마운트**

다운로드한 `.dmg` 파일을 더블클릭하여 마운트합니다.

_스크린샷 자리: `docs/screenshots/install/02-mount.png`_

**3단계 — Applications로 드래그**

DMG 창 안의 `/Applications` 단축키로 `md_dolphin.app`을 드래그합니다.

_스크린샷 자리: `docs/screenshots/install/03-drag.png`_

**4단계 — 우클릭으로 열기**

Finder에서 `/Applications`로 이동해 `md_dolphin.app`을 우클릭(또는 Control+클릭)하고, 메뉴에서 **열기**를 선택합니다.

_스크린샷 자리: `docs/screenshots/install/04-rightclick.png`_

**5단계 — 확인 다이얼로그에서 열기 클릭**

"확인되지 않은 개발자"라는 경고 다이얼로그가 나타납니다. **열기**를 클릭하세요.

_스크린샷 자리: `docs/screenshots/install/05-confirm.png`_

이 일회성 절차 이후에는 md_dolphin이 정상적으로 실행됩니다.

---

## 번들 크기 및 메모리

> 약 130MB 다운로드, Apple Silicon Mac에서 약 200MB 메모리. Electron 기반이라 다른 macOS 앱보다 큽니다. (결정 12)

사용자가 선택에 앞서 충분한 정보를 얻을 수 있도록 솔직하게 표기합니다. 네이티브 macOS 빌드는 미래 탐색 과제로 남겨져 있습니다 ([Phase 2 체크리스트](docs/release/phase2-checklist.md)).

---

## 왜 이런 안내가 필요한가요?

md_dolphin은 현재 Apple Developer Program(연 USD 99)에 가입되어 있지 않습니다. Developer ID 인증서가 없으면 macOS Gatekeeper가 더블클릭 실행을 차단합니다.

**이것이 의미하는 것:**

- 처음 실행 시 위의 우클릭 → 열기 방법이 필요합니다.
- "Apple이 이 앱을 확인할 수 없습니다"와 같은 경고가 표시될 수 있습니다.
- 이는 앱 자체의 보안 문제가 아닌 배포 방식의 한계입니다.

Phase 2에서 Apple Developer Program에 가입하고 앱을 노타라이즈할 계획입니다. 노타라이즈 완료 후에는 더블클릭으로 바로 실행되며, 이 안내는 업데이트됩니다.

---

## SHA256 검증

다운로드 무결성 검증:

```bash
shasum -a 256 -c SHA256SUMS.txt
```

`SHA256SUMS.txt` 파일은 GitHub Release 페이지에서 DMG와 함께 제공됩니다.

---

## 라이선스

[MIT](LICENSE)

---

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

---

## 보안

취약점 제보는 [SECURITY.md](SECURITY.md)를 참고하세요.

---

_스크린샷은 macOS 14 Sonoma 환경에서 캡처되었습니다._
