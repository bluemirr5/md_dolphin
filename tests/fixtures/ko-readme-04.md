# 보안 설계

## Electron 보안 모델

md_dolphin은 Electron의 보안 모범 사례를 적극적으로 따릅니다.
사용자의 로컬 파일에 접근하는 앱이므로 특히 신중한 설계가 필요합니다.

### sandbox 모드

모든 renderer 프로세스는 sandbox 모드로 실행됩니다.

```javascript
webPreferences: {
  contextIsolation: true,   // 렌더러와 preload 컨텍스트 분리
  nodeIntegration: false,   // Node.js API 직접 접근 차단
  sandbox: true,            // OS 수준 샌드박스 활성화
  webSecurity: true,        // 동일 출처 정책 적용
}
```

이 설정 덕분에 악의적인 마크다운 파일이 시스템에 접근하는 것을 차단합니다.

### contextBridge 표면 최소화

renderer가 사용할 수 있는 API는 preload에서 명시적으로 허용한 것만 가능합니다.

현재 허용된 API 목록:
- `openFile` — 파일 선택 다이얼로그
- `readFile` — 파일 내용 읽기 (경로 검증 포함)
- `openExternal` — 외부 URL 열기 (안전한 스킴만)
- `getDroppedFilePath` — 드롭된 파일 경로 추출
- `getTheme` — 현재 시스템 테마 조회
- `watchTheme` — 테마 변경 이벤트 구독

### Path Guard

파일 읽기 시 baseDir 경계를 벗어나는 경로는 차단됩니다.

> 예를 들어 문서가 `/Users/user/Documents/project/README.md`에 있다면,
> 상대 링크는 `/Users/user/Documents/project/` 내부만 허용됩니다.
> `../../etc/passwd` 같은 경로 탈출 시도는 즉시 거부됩니다.

```typescript
// path-guard.ts 핵심 로직
function isWithinBaseDir(targetPath: string, baseDir: string): boolean {
  const resolved = path.resolve(baseDir, targetPath);
  return resolved.startsWith(path.resolve(baseDir));
}
```

### 외부 URL 스킴 검증

외부 링크는 `https:`, `http:`, `mailto:` 스킴만 허용합니다.
`javascript:`, `file:`, `data:` 등은 차단됩니다.

## 보안 감사 포인트

다음 사항은 사이클마다 재검토합니다:

1. 새로운 IPC 채널 추가 시 → `ipc-channels.ts` 화이트리스트 확인
2. 새로운 파일 접근 시 → path guard 적용 여부 확인
3. 새로운 외부 통신 시 → 스킴 검증 적용 여부 확인
4. preload 표면 확장 시 → 최소 권한 원칙 준수 여부 확인
