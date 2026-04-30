# 사이클 2 — MarkdownRenderer 기초

**상태**: Ready
**선행**: 사이클 1 커밋 `e0f7116` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R6 TDD 의무 (도메인·어댑터·보안), 렌더러·fixture는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/shared/markdown/document.ts` — MarkdownDocument { url: string|undefined, rawText, outline, headings: readonly Heading[] }
- [ ] `src/shared/markdown/heading.ts` — Heading { level, text, anchor, offset }, Outline, OutlineNode
- [ ] `src/shared/markdown/index.ts` — 배럴 export
- [ ] `src/renderer/src/markdown/adapter.ts` — `parseMarkdown(rawText, url, opts?)` 외부 공개 유일, `renderTokensToReact` 내부 전용
- [ ] `src/renderer/src/markdown/MarkdownRenderer.tsx` — props: { document: MarkdownDocument }
- [ ] `src/renderer/src/markdown/nodes/` — Heading.tsx(H1~H4), Paragraph.tsx, Link.tsx, InlineCode.tsx, CodeBlock.tsx
- [ ] `tests/fixtures/large-10k.md` (정확히 10,000줄) + `tests/fixtures/build-large-md.ts` (결정적 재생성)
- [ ] `tests/markdown/` — document.test.ts, adapter.test.ts, heading.test.ts (TDD), renderer.test.tsx, security.test.ts
- [ ] `tests/main/security.test.ts` — enableSandboxBeforeReady + installSessionSecurity 단위 테스트 (node 환경)
- [ ] `src/main/security.ts` — enableSandboxBeforeReady(app) + installSessionSecurity(session) 분리; installSessionSecurity는 setPermissionRequestHandler + webRequest.onHeadersReceived(CSP 헤더 주입) 포함
- [ ] `vitest.config.ts` 갱신 — `environmentMatchGlobs`: `tests/markdown/**` → jsdom, 그 외 → node; jest-dom setup 파일 등록
- [ ] `tests/markdown/setup.ts` — `@testing-library/jest-dom/vitest` import
- [ ] `src/main/index.ts` 갱신 — sandbox(ready 이전) + permission handler(ready 이후) 흡수
- [ ] `App.tsx` 갱신 — 인라인 데모 rawText로 MarkdownRenderer 마운트 (pnpm dev 시각 확인)
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 3 시작 전)**

- [ ] `docs/benchmarks/cycle-02-baseline.md` — 1만 줄 parseMarkdown 시간 기록: (a) 인스턴스 생성 포함 전체, (b) 토큰화만, (c) 토큰→React 변환 3분할 기록 (합격 기준 없음, 사이클 5/6/7 회귀 게이트 기준점)

---

## TDD 순서

| 라운드 | 대상                                      | 핵심                                                                                                            |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| R1     | Heading / Outline / OutlineNode 타입      | tsc 통과만                                                                                                      |
| R2     | MarkdownDocument + parseMarkdown 빈 입력  | EMPTY_DOCUMENT 반환                                                                                             |
| R3     | 어댑터 헤딩 추출 + offset 통합            | level/text/offset 한 라운드에 완성 — R3 종료 커밋에 offset이 lineOffsets 변환 결과 반영 (상수·임시값 잔존 금지) |
| R4     | Outline 트리 구성                         | 형제·점프(H1→H3) 처리, buildOutline 함수 분리                                                                   |
| R5     | `html: false` 보안                        | `<script>` 입력 → DOM에 script 없음                                                                             |
| R6     | H5/H6 정책                                | 도메인 보존, 렌더러 null 반환                                                                                   |
| 사후   | RTL 스냅샷, fixture 검증, 베이스라인 측정 | AC7~AC13                                                                                                        |

---

## 인수 기준

| AC   | 조건                                                                                                                              | 검증                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| AC1  | Heading/Outline/OutlineNode 타입 import 성공                                                                                      | pnpm typecheck              |
| AC2  | parseMarkdown('', undefined) → { rawText:'', headings:[], outline:{root:[]} }                                                     | pnpm test                   |
| AC3  | heading.offset === rawText.indexOf('# 헤딩텍스트') (라인→문자 인덱스 변환 정확)                                                   | pnpm test                   |
| AC4  | `# A\n## B\n## C\n# D` → outline.root 길이 2, B·C가 A의 children                                                                  | pnpm test                   |
| AC5  | `<script>alert(1)</script>` 입력 → `<article>` DOM에 script 태그 없음                                                             | pnpm test **차단**          |
| AC6  | H5/H6 → headings 배열 보존(level 5·6), `<article>` DOM에 h5/h6 없음                                                               | pnpm test                   |
| AC7  | H1~H4→h1~h4, 문단→p, 링크→a[target=\_blank][rel=noopener noreferrer], 인라인→code, 코드블록→pre>code                              | pnpm test RTL               |
| AC8  | `<article>` wrapper — rawText 비어도 존재                                                                                         | pnpm test RTL               |
| AC9  | CodeBlock props `{ code: string; language: string\|undefined }` — 화면 미표시                                                     | pnpm typecheck + test       |
| AC10 | enableSandboxBeforeReady(app) → app.enableSandbox() 1회 (node env, mock app)                                                      | pnpm test                   |
| AC11 | installSessionSecurity(session) → setPermissionRequestHandler + webRequest.onHeadersReceived 각 1회 등록 (node env, mock session) | pnpm test                   |
| AC12 | large-10k.md 정확히 10000줄, 재생성 SHA256 동일                                                                                   | wc -l + pnpm fixtures:build |
| AC13 | parseMarkdown 1만 줄 시간 기록 → docs/benchmarks/cycle-02-baseline.md                                                             | 수동 1회                    |

---

## 설계 제약

- **markdown-it 옵션**: `{ html: false, linkify: false, typographer: false }` — 변경 금지 (사이클 7 DOMPurify 없이 allowlist 확장 불가)
- **외부 API 단일화**: `parseMarkdown`만 export — `renderTokensToReact`는 내부 전용 (markdown-it 락인 제거 원칙)
- **Heading.offset**: `token.map[0]`(line 번호) → `lineOffsets[line]`(문자 인덱스) 변환 필수. R3에서 level/text/offset 동시 완성
- **Heading.text**: 인라인 마크업 평탄화 — `## Hello [link](url)` → `"Hello link"`. anchor는 text 기반 GitHub-flavored slug (한글 보존, 중복 시 -N suffix)
- **url 필드**: `url: string | undefined` (NOT `url?: string`) — exactOptionalPropertyTypes: true 전제; 마스터 플랜 4.6의 `url: string` 가정은 사이클 3 FileService 파일 로드 도입 시 충족, 사이클 2 인라인 데모 지원을 위해 한정적으로 `| undefined` 허용
- **markdown-it 인스턴스**: 호출 단위 생성, 모듈 싱글턴 금지 — 사이클 5 GFM `.use()` 등록 시 전역 오염 방지
- **sandbox 타이밍**: enableSandboxBeforeReady → app.whenReady() 이전, installSessionSecurity → whenReady() 이후 (session.defaultSession 안정 접근)
- **vitest 환경**: tests/markdown/**→ jsdom, tests/main/** + tests/smoke.test.ts → node (기본 node); `environmentMatchGlobs` 설정 필수 (현재 단일 node 환경이라 갱신 없으면 R5/AC7 차단)
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: i18n/macOS 분기/로컬 자산 — 해당 없음. 접근성은 h1~h4 시멘틱 + `<article>` landmark로 충족. 파싱 예외는 markdown-it 기본 동작(예외 throw 없음)에 의존. 성능 회귀는 AC13 베이스라인으로 측정.
- **App.tsx rawText**: 인라인 string literal만 — import.meta.glob fixture import 금지 (번들에 fixture 누설)
- **Block 내부 표현**: `{ kind, element, key }` — 외부 미노출, 사이클 9 virtuoso 교체 용이성 확보

---

## 신규 의존성

```json
{
  "dependencies": { "markdown-it": "^14.1.0" },
  "devDependencies": {
    "@types/markdown-it": "^14.1.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0",
    "tsx": "^4.0.0"
  }
}
```

스크립트 추가: `"fixtures:build": "tsx tests/fixtures/build-large-md.ts"`

fixture 분포: 헤딩 5%, 문단 70%, 인라인/링크 포함 15%, 코드블록 10%; 한국어:영문 = 6:4; 시드 고정 의사난수로 SHA256 결정성 보장

---

## 미룬 것

- 사이클 3: FileService IPC, ⌘O, drag&drop, baseDir
- 사이클 4: 테마 / CSS 변수 / 다크모드
- 사이클 5: GFM (표·체크박스·취소선·자동링크), 회귀 ≤5초 게이트 첫 적용
- 사이클 6: shiki 신택스 하이라이팅 (CodeBlock.language props는 본 사이클 확보)
- 사이클 7: DOMPurify, 이미지, mddolphin-asset://, H5/H6 렌더 결정
- 사이클 9: react-virtuoso 가상 스크롤
- 사이클 10: 에러 UI, i18next, 접근성 ARIA

---

## Open Questions

- Q1: anchor slug GitHub 호환 알고리즘 vs 자체 결정성 (`## Hello World!` → `hello-world` vs `helloworld`) — 사이클 8 TOC 도입 시 결정. 사이클 2 잠정: lowercase + 공백→`-` + ASCII alphanumeric/한글 보존, 그 외 strip

---

## 변경 이력

| 라운드 | 항목                        | 내용                                                                 |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| P4-1   | 설계 제약 url 필드          | 마스터 플랜 4.6 충돌 해소 근거 1줄 추가                              |
| P4-2   | DoD security.ts / AC11      | installSessionSecurity에 webRequest.onHeadersReceived(CSP 헤더) 흡수 |
| P4-3   | 설계 제약 의무 기재         | 마스터 플랜 6.7 의무 항목 압축 bullet 추가                           |
| P4-4   | DoD vitest.config.ts        | environmentMatchGlobs 갱신 항목 추가                                 |
| P4-5   | DoD tests/markdown/setup.ts | jest-dom setup 파일 산출물 명시                                      |
| P4-6   | TDD 표 R3                   | "임시값 0 금지" → R3 종료 커밋 기준으로 표현 조정                    |
| P4-7   | DoD baseline.md             | 베이스라인 3분할 기록 형식 명시                                      |
| P4-11  | Open Questions Q1           | 사이클 2 잠정 anchor slug 알고리즘 추가                              |
