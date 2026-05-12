# md_dolphin ${version}

## 변경 요약

- 코드블록 복사 버튼 수정 — 코드 블록 우상단 "복사" 버튼을 눌러도 클립보드에 복사되지 않던 문제 해결 (세션 권한 핸들러가 `clipboard-sanitized-write`까지 차단하던 부분을 선별 허용으로 완화)

## 설치 방법

1. 아래 `md_dolphin-${version}-mac-universal.dmg` 파일을 다운로드합니다.
2. DMG를 열고 `md_dolphin.app`을 `/Applications` 폴더로 드래그합니다.
3. **처음 실행 시 Gatekeeper 우회** (미서명 앱): [README.md#gatekeeper-bypass](https://github.com/bluemirr5/md_dolphin/blob/main/README.md#gatekeeper-bypass) / [한국어 안내](https://github.com/bluemirr5/md_dolphin/blob/main/README.ko.md#gatekeeper-%EC%9A%B0%ED%9A%8C-%EC%95%88%EB%82%B4)

## DMG SHA256 검증

```bash
shasum -a 256 md_dolphin-${version}-mac-universal.dmg
```

위 명령 결과를 `SHA256SUMS.txt` 파일의 값과 비교하세요.

## 시스템 요구사항

- macOS 12 이상 (14/15 본인 환경 검증 완료, 12/13은 결정 5 가정 유지)
- Apple Silicon(M1~) 및 Intel Mac 모두 지원 (Universal Binary)
