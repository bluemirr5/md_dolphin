## md_dolphin ${version}

### 변경 요약

- 앱 실행 크래시 수정 — `electron-updater` 모듈 로딩 방식을 동적 import로 변경하여 시작 즉시 종료되던 문제 해결

### 설치 방법

1. 아래 `md_dolphin-${version}-mac-universal.dmg` 파일을 다운로드합니다.
2. DMG를 열고 `md_dolphin.app`을 `/Applications` 폴더로 드래그합니다.
3. **처음 실행 시 Gatekeeper 우회** (미서명 앱): [README.md#gatekeeper-bypass](https://github.com/bluemirr5/md_dolphin/blob/main/README.md#gatekeeper-bypass) / [한국어 안내](https://github.com/bluemirr5/md_dolphin/blob/main/README.ko.md#gatekeeper-%EC%9A%B0%ED%9A%8C-%EC%95%88%EB%82%B4)

### DMG SHA256 검증

```bash
shasum -a 256 md_dolphin-${version}-mac-universal.dmg
```

위 명령 결과를 `SHA256SUMS.txt` 파일의 값과 비교하세요.

### 시스템 요구사항

- macOS 12 이상 (14/15 본인 환경 검증 완료, 12/13은 결정 5 가정 유지)
- Apple Silicon(M1~) 및 Intel Mac 모두 지원 (Universal Binary)
