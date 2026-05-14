# MD Dolphin ${version}

## 새로 추가된 기능 — 다중 파일 탭

여러 `.md` 파일을 한 창에서 탭으로 동시에 열고 빠르게 전환할 수 있습니다.

- **⌘O** 또는 Finder에서 `.md` 파일을 더블클릭하면 기존 창에 **새 탭으로 추가**됩니다 (이전에는 현재 파일이 교체되었습니다).
- 이미 열려 있는 파일을 다시 열면 **기존 탭으로 자동 포커스**합니다 (중복 탭 생성 안 함).
- **탭 전환**: `⌘⌥←` / `⌘⌥→` (브라우저 스타일) 또는 `⌘⇧[` / `⌘⇧]` (VSCode 스타일)
- **⌘W**: 현재 탭 닫기. 마지막 탭에서는 창 닫기.
- 사이드바 · 와이드 모드 · 줌 설정은 창 단위로 유지됩니다.
- 기존 `⌘1` · `⌘2` · `⌘3` 단축키(사이드바 · 포커스 · 와이드)는 그대로 유지됩니다.

## 설치 방법

### Homebrew (권장)

```bash
brew upgrade --cask md-dolphin
```

### 수동 설치

1. 아래 `md_dolphin-${version}-mac-universal.dmg` 파일을 다운로드합니다.
2. DMG를 열고 `MD Dolphin.app`을 `/Applications` 폴더로 드래그합니다.
3. **처음 실행 시 Gatekeeper 우회** (미서명 앱): [README.md#gatekeeper-bypass](https://github.com/bluemirr5/md_dolphin/blob/main/README.md#gatekeeper-bypass) / [한국어 안내](https://github.com/bluemirr5/md_dolphin/blob/main/README.ko.md#gatekeeper-%EC%9A%B0%ED%9A%8C-%EC%95%88%EB%82%B4)

## DMG SHA256 검증

```bash
shasum -a 256 md_dolphin-${version}-mac-universal.dmg
```

위 명령 결과를 `SHA256SUMS.txt` 파일의 값과 비교하세요.

## 시스템 요구사항

- macOS 12 이상 (14/15 본인 환경 검증 완료, 12/13은 결정 5 가정 유지)
- Apple Silicon(M1~) 및 Intel Mac 모두 지원 (Universal Binary)
