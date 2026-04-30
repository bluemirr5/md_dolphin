# 사이클 3 — 파일 열기와 윈도우 관리

**상태**: Draft
**선행**: 사이클 2 커밋 `cd57210` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R5 TDD 의무 (FileService·path 검증·DocumentWindow), IPC 배선·UI 통합·Info.plist는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/main/file-service.ts` — FileService { openViaDialog(): Promise<OpenedFile|null>, readFile(path: string, baseDir: string|undefined): Promise<OpenedFile> } + path traversal 검증 흡수
- [ ] `src/main/path-guard.ts` — `assertWithinBaseDir(requestedPath, baseDir)` (path.relative + fs.realpath 2단 검증), `OutsideBaseDirError`
- [ ] `src/main/ipc-handlers.ts` — ipcMain.handle 등록 (`api:openFile`, `api:readFile`, `api:openExternal`)
- [ ] `src/main/document-window.ts` — DocumentWindow { window: BrowserWindow, baseDir: string|undefined, documentId: string }, 윈도우 단위 보유 Map + close 시 dispose
- [ ] `src/main/open-file-handler.ts` — `app.on('open-file')` 등록 + ready 이전 큐잉, ready 이후 즉시 처리 (macOS 분기)
- [ ] `src/shared/platform.ts` — `isMacOS`, `onMacOS<T>(fn): T|undefined` (process.platform === 'darwin' 격리 집중)
- [ ] `src/shared/ipc-channels.ts` — IPC 채널명 상수 (`API_OPEN_FILE`, `API_READ_FILE`, `API_OPEN_EXTERNAL`, `API_DOCUMENT_OPENED`). preload·ipc-handlers 양쪽에서 import — 오타·화이트리스트 단일화
- [ ] `src/preload/index.ts` 갱신 — `contextBridge.exposeInMainWorld('api', { openFile, readFile, openExternal, getDroppedFilePath })` 좁은 표면 (webUtils.getPathForFile wrapper 포함)
- [ ] `src/preload/api.d.ts` — `window.api` 타입 선언 (renderer에서 import)
- [ ] `src/renderer/src/store/document-store.ts` — Zustand 스토어 `useDocumentStore` (윈도우 단위 인스턴스, 전역 싱글턴 금지 — factory 패턴)
- [ ] `src/renderer/src/store/document-store.factory.ts` — `createDocumentStore()` 윈도우 진입점에서 1회 생성, React Context로 주입
- [ ] `src/renderer/src/components/DropZone.tsx` — 윈도우 전체 drag&drop 핸들러, dragover preventDefault, drop 시 `window.api.getDroppedFilePath(file)` 경유 (renderer에서 File.path 직접 접근 금지)
- [ ] `src/renderer/src/App.tsx` 갱신 — DropZone 래핑, store 구독, ⌘O 메뉴 응답, MarkdownRenderer에 document 주입
- [ ] `src/main/menu.ts` — macOS Application Menu (⌘O → ipcMain → FileService.openViaDialog), 표준 메뉴 템플릿 최소 구성
- [ ] `src/main/index.ts` 갱신 — open-file-handler 등록, IPC 핸들러 등록, 메뉴 설치, DocumentWindow Map 관리
- [ ] `electron-builder.yml` (또는 `package.json` build) — `mac.extendInfo.CFBundleDocumentTypes` `.md` UTI 연결 (LSHandlerRank: Default)
- [ ] `tests/main/file-service.test.ts` — TDD: openViaDialog mock, readFile UTF-8 디코딩, 빈 파일·큰 파일 분기
- [ ] `tests/main/path-guard.test.ts` — TDD: 정상 경로 통과 / `..` 거부 / 절대경로 외부 거부 / symlink 외부 거부
- [ ] `tests/main/document-window.test.ts` — TDD: 윈도우당 1 store, close 시 dispose, baseDir 갱신
- [ ] `tests/main/open-file-handler.test.ts` — TDD: ready 이전 큐잉, ready 이후 즉시 처리, 비-darwin 플랫폼 no-op
- [ ] `tests/renderer/document-store.test.ts` — TDD: setDocument 시 baseDir 자동 갱신, factory가 매번 새 인스턴스 반환
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 4 시작 전)**

- [ ] `tests/fixtures/sample-with-relative-image.md` — baseDir 기반 자산 경로를 가진 샘플 (사이클 7 protocol 핸들러 회귀 fixture로 재사용)
- [ ] `App.tsx` 인라인 데모 rawText 제거 — 실제 파일 로드만 표시 (사이클 2 데모 코드 정리)

---

## TDD 순서

| 라운드 | 대상                                                               | 핵심                                                                                                                                                      |
| ------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1     | path-guard `assertWithinBaseDir`                                   | path.relative `..` 거부 + fs.realpath symlink 거부 한 라운드에 완성                                                                                       |
| R2     | FileService.readFile                                               | UTF-8 read + baseDir 미지정 시 검증 skip + baseDir 지정 시 path-guard 호출                                                                                |
| R3     | FileService.openViaDialog                                          | dialog.showOpenDialog mock → 선택 파일 readFile 위임, 취소 시 null                                                                                        |
| R4     | DocumentWindow Map + dispose                                       | 윈도우당 1 entry, close 이벤트 시 entry 제거, baseDir 갱신                                                                                                |
| R5     | open-file-handler                                                  | ready 이전 path 큐잉, whenReady 후 focused BrowserWindow에 `webContents.send(API_DOCUMENT_OPENED, path)` flush, `process.platform !== 'darwin'`이면 no-op |
| 사후   | document-store factory, DropZone, 메뉴 통합, App.tsx 통합, fixture | AC9~AC13                                                                                                                                                  |

---

## 인수 기준

| AC   | 조건                                                                                                                                                                           | 검증                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| AC1  | `assertWithinBaseDir('/base/sub/a.md', '/base')` 통과, `'/base/../etc/passwd'` 거부                                                                                            | pnpm test                                                                                            |
| AC2  | symlink가 baseDir 외부를 가리키면 `OutsideBaseDirError` throw                                                                                                                  | pnpm test (fs mock + 실제 tmp symlink 1건)                                                           |
| AC3  | FileService.readFile 성공 → `{ ok: true, document: { path, rawText, baseDir } }`, 실패 → `{ ok: false, code: 'OUTSIDE_BASE_DIR'\|'ENOENT'\|'EACCES'\|'DECODE_FAIL', message }` | pnpm test                                                                                            |
| AC4  | FileService.openViaDialog 취소 시 null, 선택 시 readFile 결과 반환                                                                                                             | pnpm test (mock dialog)                                                                              |
| AC5  | DocumentWindow Map: `register(win)` 후 `close` 이벤트 발화 시 Map에서 제거                                                                                                     | pnpm test                                                                                            |
| AC6  | `app.on('open-file')` 등록 시 ready 이전 path 큐잉, whenReady 후 focused BrowserWindow `webContents.send(API_DOCUMENT_OPENED, path)` 호출 확인                                 | pnpm test (mock app + mock webContents)                                                              |
| AC7  | `onMacOS(fn)` → `process.platform !== 'darwin'`이면 fn 미호출, undefined 반환                                                                                                  | pnpm test                                                                                            |
| AC8  | `createDocumentStore()` 2회 호출 → 서로 다른 인스턴스 (전역 공유 금지)                                                                                                         | pnpm test                                                                                            |
| AC9  | preload `window.api` 표면: `openFile`, `readFile`, `openExternal`, `getDroppedFilePath` 4개만 (사이클 4 watchTheme 미포함)                                                     | pnpm typecheck (api.d.ts)                                                                            |
| AC10 | DropZone에 .md 파일 drop → `api.getDroppedFilePath` 호출 후 store.setDocument, baseDir = path.dirname                                                                          | pnpm test (RTL + DataTransfer mock)                                                                  |
| AC11 | electron-builder.yml `mac.extendInfo.CFBundleDocumentTypes`에 `public.markdown` UTI + `.md` 확장자 등록                                                                        | 수동 yml 검사                                                                                        |
| AC12 | `pnpm dev` 후 ⌘O로 .md 선택 → MarkdownRenderer가 실제 파일 표시                                                                                                                | 수동 1회                                                                                             |
| AC13 | Finder에서 .md 파일 더블클릭 → md_dolphin 실행되며 해당 파일 표시                                                                                                              | 수동 1회 (`npx electron-builder --dir` packaged 빌드로 검증. 서명 없이 실행 필요 시 Gatekeeper 우회) |

---

## 설계 제약

- **path-guard 2단 검증**: `path.relative` 1차 + `fs.realpath` 2차 (symlink 경유 traversal). 한쪽만 적용 금지 — symlink는 `path.relative` 통과하므로 realpath 필수 (마스터 플랜 4.4.2)
- **path-guard 위치**: main process 한정. preload·renderer에서 직접 호출 금지 — 검증 우회 표면 차단. renderer는 `window.api.readFile`만 호출하고 main이 baseDir 컨텍스트로 검증
- **baseDir 관리**: DocumentWindow가 보유. setDocument 시점에 `path.dirname(filePath)`로 자동 갱신 — store 외부에서 수동 갱신 금지 (P2-7)
- **store factory 패턴**: 모듈 최상위 `useDocumentStore` export 금지. `createDocumentStore()` + React Context 주입만 허용 — Phase 2 다중 윈도우 도입 시 코드 변경 0 (마스터 플랜 4.5)
- **open-file 큐잉**: `app.on('open-file')`은 `whenReady` 이전에 발화 가능 (Finder 더블클릭 콜드 스타트). path 배열에 큐잉 후 ready에서 flush — 누락 시 첫 더블클릭 무시되는 회귀
- **macOS 분기 격리**: `app.on('open-file')`, `app.dock` 등 darwin 전용 호출은 `src/shared/platform.ts`의 `onMacOS()` 래퍼 통과 의무 — 분기 검색·테스트 1지점 집중 (마스터 플랜 0.3)
- **preload 표면 좁힘**: `openFile`, `readFile`, `openExternal` 3개만 노출. `watchTheme`은 사이클 4에서 추가. 채널명 prefix `api:` 통일 — 향후 채널 화이트리스트 적용 용이
- **readFile baseDir optional**: `baseDir: string | undefined` (NOT optional `?`) — exactOptionalPropertyTypes 전제. 인라인 데모·테스트 fixture 호출 시 검증 skip 명시적
- **drop 파일 경로**: renderer에서 `File.path` 직접 접근 금지. preload의 `webUtils.getPathForFile(file)` wrapper(`api.getDroppedFilePath`)만 허용 — Electron 32+/sandbox=true 환경에서 `.path` 속성이 제거됨
- **IPC 에러 응답 contract**: ipcMain.handle wrapper에서 모든 throw를 `{ ok: false, code: 'OUTSIDE_BASE_DIR'|'ENOENT'|'EACCES'|'DECODE_FAIL', message }` 형태로 정규화. renderer는 `ok` 여부만 분기 — 사이클 10 에러 UX에서 code 기반 i18n 키 매핑 예정
- **IPC 채널명**: `src/shared/ipc-channels.ts` 상수만 사용. preload·ipc-handlers 양쪽에서 동일 상수 import — 문자열 오타 방지, 향후 채널 화이트리스트 감사 용이
- **MarkdownRenderer 순수 prop**: MarkdownRenderer는 store를 직접 구독하지 않는다. App.tsx에서 `useDocumentStore(s => s.document)` 후 prop으로 전달 — 사이클 2 컴포넌트 인터페이스 동결 유지
- **menu.ts 최소 패치**: 사이클 3에서 File 메뉴에 Open(⌘O)만 추가, 나머지 Electron 기본 메뉴 유지. 사이클 9에서 Application Menu 본격 구성(인쇄·zoom·View 등) 예정
- **store Context 합류 순서**: `ThemeProvider`(외·앱 전역) → `DocumentProvider`(내·윈도우 단위). App.tsx 진입점 고정 — 사이클 4 ThemeProvider 도입 시 이 순서 준수
- **drop preventDefault**: `dragover` + `drop` 양쪽 preventDefault 의무 — 누락 시 Chromium이 파일을 새 탭으로 열어버려 앱 외부로 이탈
- **readFile 성능**: `fs.promises.readFile` 비동기, encoding `utf8` 1회 디코딩. 1만 줄(~500KB) 기준 100ms 이내 — 사이클 9 cold start 측정에 포함
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 케이스 UI는 사이클 10, 메뉴 라벨 i18n은 사이클 10. 접근성 — DropZone에 `role="region"` + `aria-label="Drop markdown file here"`. 1만 줄 회귀 — 해당 없음 (사이클 5/6/7 의무)
- **ESM 동적 import 금지**: FileService에서 `await import('fs')` 금지 — top-level `import { promises as fs } from 'node:fs'`만 사용. 테스트 mock 일관성 확보

---

## 신규 의존성

```json
{ "dependencies": { "zustand": "^4.5.0" } }
```

기존 electron-builder는 사이클 1에 devDependency로 설치됨 (사이클 11a까지 dist 미실행, 본 사이클은 yml 설정만 추가).

---

## 미룬 것

- 사이클 4: watchTheme IPC, ThemeProvider Context, CSS 변수, 다크모드 자동 추종
- 사이클 5: GFM, 1만 줄 회귀 게이트 첫 적용
- 사이클 7: DOMPurify, 이미지, `mddolphin-asset://` 핸들러 (본 사이클의 path-guard 재사용)
- 사이클 8: TOC 사이드바
- 사이클 9: react-virtuoso, 메모리 모니터링, 윈도우 close 시 store dispose 회귀 검증
- 사이클 10: 에러 UX (손상된 .md, 인코딩, 권한, 큰 파일), i18next, ARIA 본격
- 사이클 11a: electron-builder dist 실행, Universal Binary, DMG 생성 (본 사이클은 yml 설정만)

---

## Open Questions

- Q1: 다중 파일 드롭 정책 — 첫 파일만 현재 윈도우에 로드 vs 추가 파일은 새 윈도우 (Phase 2 다중 윈도우 의존). 사이클 3 잠정: 첫 파일만 처리, 2번째 이후 무시 + console.warn. Phase 2에서 결정
- Q2: 인코딩 자동 감지 (EUC-KR 등) — 사이클 10 에러 UX에서 결정. 사이클 3 잠정: UTF-8 고정, 디코딩 실패 시 `{ ok: false, code: 'DECODE_FAIL' }` 반환

---

## 변경 이력

| 라운드 | 항목                    | 내용                                                                                     |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| P3-1   | ipc-channels.ts 신설    | IPC 채널명 상수 단일화, preload·ipc-handlers 양쪽 import                                 |
| P3-2   | path-guard 미룬 것      | 사이클 7 protocol 핸들러 재사용 명시                                                     |
| P3-4   | open-file 라우팅        | flush 시 focused BrowserWindow webContents.send(API_DOCUMENT_OPENED) 잠정 결정, AC6 갱신 |
| P3-5   | drop 파일 경로          | preload webUtils.getPathForFile wrapper 의무화, AC9·AC10·DropZone DoD 갱신               |
| P3-6   | Context 합류 순서       | ThemeProvider(외) → DocumentProvider(내) 고정, 설계 제약 추가                            |
| P3-7   | IPC 에러 contract       | `{ ok, code, message }` 정규화, AC3 갱신, Q2 잠정안 연동                                 |
| P3-8   | menu.ts 범위            | 사이클 3은 File>Open만 패치, 사이클 9 본격 구성 명시                                     |
| P3-9   | AC13 검증 방법          | pnpm build → `npx electron-builder --dir` packaged 빌드로 수정                           |
| P3-10  | MarkdownRenderer 순수성 | store 직접 구독 금지, App.tsx prop 주입 설계 제약 추가                                   |
| P3-11  | readFile 성능           | 100ms 이내 + 사이클 9 cold start 측정 포함 명시                                          |
