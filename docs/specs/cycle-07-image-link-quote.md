# 사이클 7 — 이미지·외부 링크·인용문 + DOMPurify + 로컬 자산 protocol

**상태**: Ready
**선행**: 사이클 6 커밋 `3be9a91` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R2 TDD 의무 (asset protocol 화이트리스트, DOMPurify sanitize). 이미지/blockquote/링크 컴포넌트, 라이트박스, 회귀 측정, App 데모 갱신은 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/main/asset-protocol.ts` 신규 — `mddolphin-asset://` custom protocol 핸들러 등록 (P2-7). baseDir 화이트리스트(현 윈도우 baseDir 셋), `path-guard.ts` 재사용 + `path.relative` `..` 거부, symlink resolve 후 baseDir 외부면 거부, MIME 추론(image/png|jpeg|gif|webp만 허용), 그 외 거부. `DocumentWindowManager` 인스턴스를 인자로 받는 함수 형태로 export(전역 import 회피)
- [ ] `src/main/index.ts` 갱신 — `app.whenReady` 이후 `registerAssetProtocol(documentWindowManager)` 호출. `protocol.registerSchemesAsPrivileged`는 `app.ready` 이전(top-level) 등록
- [ ] `src/main/document-window.ts` 갱신 — 윈도우별 baseDir 등록/해제(`registerBaseDir(windowId, dir)` / unregister on close). asset-protocol 모듈이 참조
- [ ] `src/main/security.ts` 갱신 — CSP `img-src` 디렉티브에 `https: mddolphin-asset:` 추가. `index.html`(또는 renderer entry)의 `<meta>` CSP도 동일 갱신(이중방어, 4.4.1)
- [ ] `src/renderer/src/markdown/nodes/Image.tsx` 신규 — `{ src, alt, title }` props. 로컬 경로(`/`, `./`, 비-URL) → `mddolphin-asset://` 변환, http/https 원본 유지. `data:` URL은 raster MIME prefix 4종만 통과(svg+xml 거부 시 빈 src + alt 폴백). alt 캡션 `<figcaption>`, 클릭 시 라이트박스 모달 오픈, 로드 실패 시 alt 텍스트 표시
- [ ] `src/renderer/src/markdown/nodes/ImageLightbox.tsx` 신규 — 모달 오버레이, ESC/오버레이 클릭/닫기 버튼(`aria-label="닫기"`)으로 종료, focus trap(첫/마지막 focusable 식별 후 Tab/Shift+Tab keydown 가로채 순환. focusable이 닫기 버튼 1개면 동일 element로 순환), body scroll lock
- [ ] `src/renderer/src/markdown/nodes/Blockquote.tsx` 신규 — 좌측 accent bar(`--quote-bar`), 인용 텍스트 `--text` 톤 다운, 중첩 시 좌측 패딩 누적
- [ ] `src/renderer/src/markdown/nodes/Link.tsx` 갱신 — http/https 외부 링크는 클릭 시 `window.api.openExternal(url)` 호출(IPC), `target="_blank" rel="noreferrer noopener"` 속성 부여. hover/focus 툴팁(URL 미리보기, native `title` 대신 커스텀 툴팁)
- [ ] `src/renderer/src/markdown/sanitize.ts` 신규 — DOMPurify 인스턴스 + 커스텀 hook. allowlist: 태그 `pre|code|span`, 속성 `class|style`. **style 화이트리스트 함수**: `;`로 split → `prop: value`로 분리 → prop이 `--shiki-light`/`--shiki-dark`/`color`일 때만 value를 `^#[0-9a-fA-F]{3,8}$`로 검증 → 통과 declaration만 `;` join. 미통과 declaration은 drop. 모든 declaration drop 시 `style` 속성 자체 strip. `sanitizeShikiHtml(html: string): string` export
- [ ] `src/renderer/src/markdown/nodes/CodeBlock.tsx` 갱신 — shiki `dangerouslySetInnerHTML` 직전 `sanitizeShikiHtml` 1회 적용. plain fallback 경로는 무영향
- [ ] `src/renderer/src/markdown/adapter.ts` 갱신 — `image` 토큰 → `<Image>` 컴포넌트, `blockquote_open`/`close` → `<Blockquote>` 컴포넌트, `link_open` 외부 URL 판정 후 `target=_blank rel="noreferrer noopener"` 속성 props 전달
- [ ] `src/main/ipc-handlers.ts` 갱신 — 사이클 3 기존 `api:openExternal` 핸들러를 silent ignore에서 **명시 reject + `console.warn`**으로 강화 (비허용 protocol 시). 신규 채널 도입 금지 — `SAFE_EXTERNAL_PROTOCOLS`(http/https/mailto)는 사이클 3 그대로 위임
- [ ] `src/renderer/src/styles/blockquote.css` 신규 — 좌측 accent bar(4px, `--quote-bar`), 들여쓰기, 톤 다운 텍스트
- [ ] `src/renderer/src/styles/image.css` 신규 — figure/figcaption, 라이트박스 오버레이(`position: fixed`, `inset: 0`, 반투명 배경), 닫기 버튼, 로드 실패 alt 폴백 스타일
- [ ] `src/renderer/src/main.tsx` (또는 styles 배럴) — `blockquote.css`, `image.css` import
- [ ] `src/renderer/src/App.tsx` 갱신 — `EMPTY_HINT_TEXT`에 이미지(원격 1·로컬 1)·blockquote(중첩 1)·외부 링크 1줄 추가. 사이클 5/6 데모는 1줄씩 축소
- [ ] `tests/main/asset-protocol.test.ts` — TDD R1: baseDir 등록된 정상 경로 통과, `..` 포함 거부, baseDir 외부 symlink 거부, 미등록 윈도우 baseDir 거부, 비허용 MIME 거부, 윈도우 close → entry 삭제 → 동일 windowId 요청 거부
- [ ] `tests/markdown/sanitize.test.ts` — TDD R2: shiki dual `<span style="--shiki-light:#abc; --shiki-dark:#def;">` 통과, `<span style="color:#abc">` 통과, `<script>` strip, `<span onerror=...>` strip, 임의 `style="background:url(...)"` strip, 공백 변형/순서 역전/신규 변수 1개 추가 시 통과 declaration만 살아남고 나머지 strip
- [ ] `tests/markdown/image.test.tsx` — 사후 RTL: 로컬 경로 src가 `mddolphin-asset://`로 변환, alt 캡션 노출, 클릭 시 라이트박스 오픈, ESC로 종료
- [ ] `tests/markdown/link.test.tsx` — 사후 RTL: http 링크 클릭 시 `window.api.openExternal` 호출, `rel` 속성 검증, hover 툴팁 노출
- [ ] `tests/markdown/blockquote.test.tsx` — 사후 RTL: 단일/중첩 blockquote 렌더, accent bar 클래스 적용
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 8 시작 전)**

- [ ] `docs/benchmarks/cycle-07-regression.md` — `tests/fixtures/large-10k.md` 1만 줄 회귀. parseMarkdown p50, sanitize 적용 후 첫 페인트 p50. 사이클 6 baseline(6.25ms) 대비 증가율(%). **합격: parseMarkdown p50 ≤ 5초** (마스터 플랜 7.1 P2-5). 측정 환경 마스터 플랜 4.7.3 표준

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | `mddolphin-asset://` 핸들러 화이트리스트 (P2-7) | baseDir 통과, `..` 거부, symlink 외부 거부, 미등록 윈도우 거부, 비허용 MIME 거부, close 후 잔여 요청 거부 |
| R2 | DOMPurify `sanitizeShikiHtml` (P2-2) | shiki dual `<span style>` 통과, `<script>`/`on*`/임의 CSS strip, 공백·순서·신규 변수 강건 |
| 사후 | Image·ImageLightbox·Blockquote·Link 갱신·sanitize 통합·외부 링크 IPC 강화·App 데모·1만 줄 회귀 | AC4~AC10 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `mddolphin-asset://<windowId>/<relPath>` 요청: 등록된 baseDir 내부 정상 파일은 200 응답, baseDir 외부(`..`/symlink) 또는 미허용 MIME 또는 미등록 윈도우는 거부(404 또는 reject) | pnpm test |
| AC2 | `sanitizeShikiHtml` 입력: 실제 shiki dual 출력(예: `<pre class="shiki"><code><span style="--shiki-light:#005cc5;--shiki-dark:#79b8ff">const</span></code></pre>`) → 변형 없음. `<script>alert(1)</script>` 입력 → 빈 문자열. `<span style="background:url(x)">` → `style` 속성 strip 후 `<span>` 유지. 공백 변형(`--shiki-light: #abc; --shiki-dark: #def`)·순서 역전·신규 변수 1개 추가 시 통과 declaration만 살아남고 나머지 strip | pnpm test |
| AC3 | 코드 블록 라이트/다크 전환 시 sanitize 적용 후에도 토큰 색상 유지(사이클 6 AC6 회귀 없음) | 수동 1회 |
| AC4 | 로컬 경로 이미지(`![alt](./img.png)`) → DOM에 `<img src="mddolphin-asset://...">`. 원격 이미지(`https://...`) → src 무변환. `data:image/svg+xml` URL은 src로 통과되지 않음(alt 폴백). alt 빈 값이면 `<figcaption>` 미렌더 | pnpm test RTL |
| AC5 | 이미지 클릭 시 라이트박스 모달 오픈. ESC/오버레이 클릭/닫기 버튼으로 종료. 닫기 버튼 `aria-label="닫기"`, focus trap 동작, body `overflow: hidden` 적용/복원. Tab으로 닫기 버튼에서 다음 focusable로 이동 시 모달 외부로 빠지지 않음(첫 focusable로 순환). Shift+Tab도 동일 | pnpm test RTL + 수동 1회 |
| AC6 | 외부 링크 클릭 → `window.api.openExternal(url)` 호출(사이클 3 기존 `api:openExternal` 채널), main에서 `SAFE_EXTERNAL_PROTOCOLS`(http/https/mailto) 검사 후 `shell.openExternal`. file:// 등 비허용 protocol은 reject + `console.warn` | pnpm test RTL + 수동 1회 |
| AC7 | 외부 링크 hover/focus 시 URL 툴팁 노출(키보드 focus도 동일). `<a>` 속성에 `target="_blank" rel="noreferrer noopener"` 존재 | pnpm test RTL |
| AC8 | blockquote 렌더 시 좌측 accent bar 가시. 중첩 blockquote는 들여쓰기 누적. 라이트/다크 모두 토큰 사용(`--quote-bar`, `--text`) | 수동 1회 |
| AC9 | `tests/fixtures/large-10k.md` 1만 줄 회귀: parseMarkdown p50 ≤ 5초. 사이클 6 baseline 대비 증가율 보고. sanitize 적용 첫 페인트 p50 동일 보고서 기록(게이트 아님) | 수동 1회 |
| AC10 | adapter.ts 외부 export = `parseMarkdown` + `getCachedTokens` 2개 유지 (사이클 6 AC3 회귀 없음). `MarkdownDocument` 타입 무변경 | pnpm typecheck + grep |

---

## 설계 제약

- **`mddolphin-asset://` URL 구조**: `mddolphin-asset://<windowId>/<relPath>`. windowId는 BrowserWindow id(숫자). 핸들러는 `registerBaseDir(windowId, dir)`로 등록된 dir과 join → `path.resolve` → `path.relative` `..` 거부 → `fs.realpath`로 symlink resolve → 다시 baseDir 화이트리스트 검사 (P2-7 결정 4.4.2). Phase 2 다중 윈도우 도입 시 windowId를 opaque token으로 전환 검토 — 본 사이클 비범위
- **path-guard 재사용**: 사이클 1의 `src/main/path-guard.ts`(허용 확장자 + 절대 경로 정규화)를 import. 신규 trav 검사 helper는 path-guard에 추가하고 asset-protocol에서 재사용 — 보안 검사 단일 소스
- **DOMPurify 적용 지점 한정 (P2-2 + 부채 ④)**: shiki `dangerouslySetInnerHTML` 직전 1회만 sanitize. **task-list checkbox는 React 트리에서 완결 — DOMPurify 미경유** (`docs/notes/cycle-06-html-inline-review.md` 인용). 그 외 사용자 마크다운은 markdown-it `html: false`로 텍스트 노드만 추출되므로 sanitize 불필요. DOMPurify는 renderer Chromium의 native DOMParser 사용 — jsdom 등 추가 의존성 불요. R2 sanitize.test.ts는 vitest jsdom/happy-dom 환경에서 실행(기존 markdown 테스트 환경 동일)
- **shiki style allowlist**: 정규식 단일 매칭이 아닌 속성별 화이트리스트 함수. 공백·순서 변형 강건. 신규 `--shiki-*` 변수 추가 시 함수 한 줄 갱신. CSP `style-src 'unsafe-inline'`(결정 13)와 다중 방어선
- **외부 링크 IPC 흐름**: 사이클 3 기존 `api:openExternal` 재사용. 핸들러를 silent ignore → 명시 reject + warn으로 강화. P3-1 IPC 단일 소스 유지. renderer `Link.tsx` onClick → `event.preventDefault()` → `window.api.openExternal(url)` → preload IPC → main `api:openExternal` 핸들러 → `SAFE_EXTERNAL_PROTOCOLS` 검사 → `shell.openExternal`
- **로컬 vs 원격 이미지 판정**: src가 `http://`/`https://`로 시작하면 원격, 그 외(절대/상대 경로)는 로컬 → `mddolphin-asset://` 변환. `data:` URL은 raster MIME prefix(`data:image/png`, `data:image/jpeg`, `data:image/gif`, `data:image/webp`)만 통과. `data:image/svg+xml` 거부 — Image 컴포넌트에서 prefix 검사 후 비어 있는 src/alt 폴백
- **라이트박스 focus trap**: 모달 오픈 시 닫기 버튼에 focus, Tab 순환은 모달 내부로 한정. 종료 시 트리거 이미지로 focus 복원. 라이브러리 도입 없이 수동 구현(react-focus-lock은 사이클 9 가상화 시 재검토)
- **윈도우-baseDir 매핑 lifetime**: `document-window.ts`가 BrowserWindow 생성 시 `registerBaseDir(window.id, path.dirname(filePath))`, close 이벤트에 unregister. baseDir 미등록 windowId 요청은 거부 — 윈도우 닫힘 후 잔여 요청 차단. close → unregister 후 잔여 요청은 미등록 windowId로 분류되어 거부(404). 안전한 race
- **모듈 결합도**: asset-protocol 모듈은 `DocumentWindowManager` 인스턴스를 인자로 주입받는 함수 형태(전역 import 회피). 테스트 가능성 + 순환 import 회피
- **MIME 화이트리스트**: 이미지 raster 4종(`image/png|jpeg|gif|webp`)만 허용. **SVG 차단** — 사이클 9에서 DOMPurify SVG profile 적용 후 화이트리스트 추가
- **Image 컴포넌트 props 동결 후보**: `{ src, alt, title }`만 props. 라이트박스 상태는 컴포넌트 내부. adapter는 markdown-it `image` 토큰의 attrs만 그대로 전달
- **App 데모 압축**: `EMPTY_HINT_TEXT`는 사용 안내 + 이미지 2종(원격/로컬) + blockquote 중첩 1개 + 외부 링크 1줄. 사이클 5(GFM 표/체크박스) 1줄, 사이클 6(코드 3종) 1줄로 축소
- **i18n 직표기 허용**: 라이트박스 `aria-label="닫기"`, 외부 링크 툴팁 한국어 직표기. i18next는 사이클 10
- **회귀 5초 게이트**: parseMarkdown p50만 게이트. sanitize 적용 후 첫 페인트는 참고. 초과 시 9.1.5 — 사이클 9 가상 스크롤 앞당김 트리거. 본 사이클에서 가상화·sanitize lazy화 금지
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — 이미지 로드 실패 시 alt 텍스트 표시, 비허용 protocol 시 `console.warn`. 접근성 — 이미지 `alt`, 라이트박스 ESC/오버레이/focus trap, 링크 툴팁 키보드 focus 노출. 보안 — DOMPurify(style strip + shiki allowlist), `mddolphin-asset://` baseDir 화이트리스트, `shell.openExternal` http/https/mailto만 허용. macOS 분기 — 해당 없음(custom protocol API 공통)

---

## 신규 의존성

```json
{ "dependencies": { "dompurify": "^3.0.0" } }
```

DOMPurify 3.x ESM. 자체 `.d.ts` 동봉이라 `@types/dompurify` 불요. 정확한 patch는 구현자가 npm 최신 3.x로 결정.

---

## 미룬 것

- 사이클 8: TOC 사이드바
- 사이클 9: react-virtuoso 가상화, shiki lazy `loadLanguage`, 1만 줄 1초 본격 측정, react-focus-lock 도입 검토, SVG MIME 화이트리스트 추가 + DOMPurify SVG sanitize, asset protocol windowId opaque token 전환, 인쇄 미디어 쿼리, WCAG AA 본격 측정 보고서, shiki dual theme 라이트색상 inline style 직접 주입(사이클 6 부채), vitest mock 격리(사이클 6 부채), highlighter 무한 재시도(사이클 6 부채), clipboard 실패 피드백(사이클 6 부채), 빌드 청크 700KB+ 분할(사이클 6 부채), **Image useMemo(CR7-5), sanitize top-level window 격리(CR7-9), asset-protocol TOCTOU O_NOFOLLOW(CR7-10), windowId -1 가드(CR7-11)**
- 기타: blockquote inline 단독 토큰 처리(CR7-12) — 현 markdown-it 동작 미발생, 파서 전환 시 재점검
- 사이클 10: 사용자 설정·테마 override UI·i18next·에러 UX

---

## 변경 이력

| 라운드 | 항목 | 내용 |
|--------|------|------|
| P7-1 | 외부 링크 IPC 중복 제거 | 사이클 3 `api:openExternal` 재사용. 신규 `external:open` 채널 도입 취소. 핸들러를 silent ignore → 명시 reject + warn으로 강화. P3-1 IPC 단일 소스 유지 |
| P7-2 | shiki style allowlist 정규식 → 속성별 화이트리스트 함수 | 단일 정규식 매칭이 brittle해서 속성별 split + value 검증 함수로 교체. 공백·순서·신규 변수 강건 |
| P7-3 | SVG MIME 차단 | image/svg+xml 거부. 사이클 9 DOMPurify SVG profile 도입 시 추가 |
| P7-4 | CSP `img-src` 갱신 + data:svg 차단 | `https:`, `mddolphin-asset:` 추가. data: prefix raster 4종만 통과 |
| P7-5 | windowId opaque token 부채 명시 | Phase 2 다중 윈도우에서 전환 검토 |
| P7-6 | asset-protocol 모듈 의존성 주입 + close race 명시 | DocumentWindowManager 주입 + R1 close 테스트 추가 |
| P7-7 | 라이트박스 focus trap 명시화 | AC5/DoD 17 보강 — 단일 focusable 동일 element 순환 |
| P7-8 | `@types/dompurify` 제거 | dompurify 3.x 자체 .d.ts 동봉 |
| P7-9 | vitest 환경 명시 | renderer Chromium native DOMParser, jsdom/happy-dom 환경 명시 |
| P7-10 | windowId preload 주입 정식화 | `window.__windowId` 전역 → preload `ipcRenderer.sendSync('api:getWindowId')` 패턴으로 교체. `window.api.windowId`로 contextBridge 표면에 노출. 로컬 이미지 변환 e2e 활성화 |
| P7-11 | CSP default-src 통일 + 이중방어 동기화 | meta/header 양쪽 `default-src 'none'` + img-src/style-src/script-src/font-src/connect-src/object-src/base-uri 동기화. 마스터 플랜 4.4 표준 갱신 doc-writer 인계 |
| P7-12 | 사이클 4 토큰 동결 회복 | blockquote.css `--accent` → `--quote-bar`, image.css 미정의 변수 5종(`--surface-2`, `--text-muted`, `--border`, `--surface-elevated`, `--text-on-elevated`) → 기존 토큰(`--quote-bar`/`--text`/`--code-bg`) 또는 fallback 인라인. 신규 CSS 변수 도입 0건 |
| P7-13 | path-guard 재사용 + dispose 정리 + sanitize hook 정식화 + focus trap 테스트 | CR7-1/CR7-3/CR7-4/CR7-6 흡수. asset-protocol이 path-guard `assertWithinBaseDir` 호출, ipc dispose에 removeHandler 4건, sanitize.ts `forceKeepAttr`+`removeAttribute` 채택, image.test.tsx Tab/Shift+Tab 순환 테스트 추가 |
| P7-14 | 인계 부채 재배치 | 사이클 8(TOC)→사이클 9(성능)로 재배치. 영역 응집도 회복(TOC와 무관한 5건이 잘못 박혔던 것 정정). CR7-12는 미발생 노트만 |
