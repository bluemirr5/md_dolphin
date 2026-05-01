## md_dolphin ${version}

### 변경 요약

<!-- 이 릴리스에 포함된 변경 사항을 기록하세요 -->

- 변경 사항 1
- 변경 사항 2

### 설치 방법

1. 아래 `md_dolphin-${version}-mac-universal.dmg` 파일을 다운로드합니다.
2. DMG를 열고 `md_dolphin.app`을 `/Applications` 폴더로 드래그합니다.
3. **처음 실행 시 Gatekeeper 우회 방법** (미서명 앱):
   1. Finder에서 `.app` 우클릭
   2. "열기" 메뉴 선택
   3. 확인 다이얼로그에서 "열기" 클릭

### DMG SHA256 검증

```bash
shasum -a 256 md_dolphin-${version}-mac-universal.dmg
```

위 명령 결과를 `SHA256SUMS.txt` 파일의 값과 비교하세요.

### 시스템 요구사항

- macOS 12 이상 (14/15 본인 환경 검증 완료, 12/13은 결정 5 가정 유지)
- Apple Silicon(M1~) 및 Intel Mac 모두 지원 (Universal Binary)
