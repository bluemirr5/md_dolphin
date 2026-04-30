# 사이클 6 — 코드 블록 디자인 + shiki 하이라이팅

**상태**: Draft (P6 architect 리뷰 반영 완료)
**선행**: 사이클 5 커밋 `9e450ed` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R2 TDD 의무 (shiki 인스턴스 격리·언어 안전 fallback·인라인 재귀·adapter export 동결 회복). 시각 디자인·복사 버튼·1만 줄 회귀 측정·부채 정리는 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/renderer/src/markdown/shiki.ts` 신규 — 모듈 싱글턴 highlighter (`createHighlighter` Promise 캐시), `highlightCode(code, lang): Promise<string>`. 미지원 언어는 `null` 반환 (호출자가 plain fallback). 로드 실패 시 `console.warn` + `null`. 커스텀 테마 `light-soft`/`dark-soft` dual 동시 등록 (디자인 토큰 5.3 — 채도 낮은 파스텔)
- [ ] `src/renderer/src/markdown/nodes/CodeBlock.tsx` 갱신 — 언어 라벨(우상단), 복사 버튼(hover 표시, `navigator.clipboard.writeText`, `aria-label="코드 복사"`), shiki 결과는 `useEffect`로 비동기 적용 후 `dangerouslySetInnerHTML` 주입(미적용 동안 plain `<pre><code>`). hover 진입 전 복사 버튼 시각 비표시 + Tab 포커스로 노출
- [ ] `src/renderer/src/markdown/shiki-theme.ts` 신규 (또는 shiki.ts 내부) — `light-soft`/`dark-soft` JSON 테마 객체 (텍스트메이트 형식). 디자인 토큰 5.3 6~8종 색상만
- [ ] `src/renderer/src/styles/codeblock.css` 신규 — 카드 배경(`--code-bg`)·모서리 8px·언어 라벨(우상단 absolute, monospace)·복사 버튼(hover/focus 표시, `:hover` opacity 전환). CSS 변수 신규 추가 금지 (사이클 4 토큰 동결)
- [ ] `src/renderer/src/markdown/adapter.ts` 갱신 — **부채 ①** `renderInlineTokens`의 `strong_open`/`em_open` 분기를 `s_open`과 동일 재귀 패턴으로 통일. **부채 ②** `export function renderTokens` 제거. **모듈 스코프 캐시** `WeakMap<MarkdownDocument, readonly Token[]>` 도입 — `parseMarkdown` 호출 시 토큰을 캐시에 저장, 모듈 내부 lookup helper(`getCachedTokens(doc)`) export. miss 시 `new MarkdownIt(...).parse(doc.rawText, {})` 1회 fallback. 외부 API는 `parseMarkdown` 1개 (사이클 2 동결 회복)
- [ ] `src/renderer/src/markdown/MarkdownRenderer.tsx` 갱신 — `renderTokens` import 제거, `getCachedTokens(document)` 소비. `MarkdownDocument` 타입 변경 없음
- [ ] `src/renderer/src/styles/gfm.css` 갱신 — **부채 ⑤** 표 셀 테두리 색상 라이트/다크 모두 `--code-bg`/`--bg` 조합으로 재조정 (WCAG AA 대비 확보, 토큰 변경 없음)
- [ ] `src/renderer/src/App.tsx` 갱신 — **부채 ③** `EMPTY_HINT_TEXT` 압축: ⌘O / 드래그&드롭 안내 + 코드 블록 데모 3종(typescript/python/언어 미지정). 사이클 5 GFM 데모는 표 1개 + 체크박스 2줄로 축소
- [ ] `src/renderer/src/main.tsx` (또는 styles 배럴) — `codeblock.css` import
- [ ] `tests/markdown/shiki.test.ts` — TDD R1: highlighter 싱글턴 (2회 호출 시 동일 promise 재사용), 미지원 언어 `null`, 빈 문자열/공백 안전 처리
- [ ] `tests/markdown/codeblock.test.tsx` — 사후 RTL: 언어 라벨 표시, 복사 버튼 `aria-label`·Tab 포커스, plain fallback (shiki resolve 전 plain text 표시)
- [ ] `tests/markdown/adapter-inline-recursion.test.tsx` — TDD R2: `**[link](url)**` 입력 시 `<strong><a>...</a></strong>` 구조 (text 손실 없음). `*~~s~~*` 등 중첩 케이스
- [ ] `tests/markdown/adapter-cache.test.ts` — TDD R2: `parseMarkdown(doc)` 후 `getCachedTokens(doc)` 동일 토큰 배열 반환. 캐시 miss(직접 생성한 doc) 시 fallback 파싱이 동일 토큰 산출. 외부 export는 `parseMarkdown`/`getCachedTokens` 2개로 한정 (`renderTokens` 미존재 grep 검증)
- [ ] `docs/notes/cycle-06-html-inline-review.md` — **부채 ④** 검토 보고: adapter.ts task-list checkbox 변환 패턴이 사이클 7 DOMPurify 도입 시 영향받는지 결론 (1~2문단). 사이클 7 spec에서 본 결론 참조
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 7 시작 전)**

- [ ] `docs/benchmarks/cycle-06-codeblock-regression.md` — `tests/fixtures/large-10k.md` 1만 줄 회귀. (a) parseMarkdown 전체 p50 (b) tokenStreamToBlocks p50 (c) shiki 하이라이팅 적용 후 첫 페인트 p50 측정. 사이클 5 baseline 대비 증가율(%) 기록. **합격: (a) p50 ≤ 5초** (마스터 플랜 7.1 P2-5). 초과 시 9.1.5 — 사이클 9 가상 스크롤 앞당김 트리거

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | shiki highlighter 싱글턴 + 안전 fallback | 2회 호출 시 동일 promise, 미지원 언어 `null`, 빈 입력 안전 |
| R2 | adapter 인라인 재귀(부채 ①) + export 동결 회복(부채 ②) | `**[link](url)**` link 토큰 보존, `getCachedTokens` 캐시 hit/miss 동치성, `renderTokens` export 부재 |
| 사후 | CodeBlock 시각·복사 버튼·shiki 비동기 주입, codeblock.css, gfm.css 대비 재조정, App 데모 갱신, 1만 줄 회귀, 부채 ④ 검토 | AC4~AC9 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | `highlightCode('const x = 1', 'typescript')` → shiki HTML(`<pre class="shiki"...>` 포함). 미지원 언어 → `null`. 동일 highlighter 인스턴스 2회 호출 시 `createHighlighter` 1회만 실행 | pnpm test |
| AC2 | `**[link](url)**` 입력 → `<strong>` 안에 `<a target=_blank>` 노드 존재 (text 손실 없음). `*~~s~~*` → `<em><del>s</del></em>` | pnpm test RTL |
| AC3 | `MarkdownRenderer`가 `renderTokens` import 없이 동작. adapter.ts 외부 export = `parseMarkdown` + `getCachedTokens` 2개 (`renderTokens` 부재 grep). `MarkdownDocument` 타입은 무변경 (`tokens` 필드 미존재) | pnpm typecheck + grep |
| AC4 | 코드 블록에 언어 라벨(우상단)·복사 버튼 노출. 복사 버튼 `aria-label="코드 복사"`, Tab 포커스 가능, hover 시 시각 노출. 클릭 시 `navigator.clipboard.writeText` 호출 | pnpm test RTL |
| AC5 | shiki 적용 전 plain `<pre><code>` 가시 (FOUC 없음), 적용 후 syntax highlighting HTML 주입. 언어 미지정/미지원 코드는 plain 유지 | 수동 1회 + RTL |
| AC6 | 라이트/다크 테마 전환 시 코드 블록 배경 `--code-bg` 일관, shiki 토큰 색상이 `light-soft`/`dark-soft` dual 출력에서 디자인 토큰 5.3 파스텔 톤으로 표시. 결과 HTML에 `--shiki-dark` 인라인 변수가 포함되면 dual 채택 검증, 아니면 ThemeContext fallback 경로 동작 확인 | 수동 1회 |
| AC7 | gfm.css 표 셀 테두리 라이트/다크 모두 WCAG AA 대비 충족 (3:1 이상, 비-텍스트 UI 컴포넌트 기준) | 수동 시각 1회 |
| AC8 | `tests/fixtures/large-10k.md` 1만 줄 회귀: parseMarkdown 전체 p50 ≤ **5초** — `docs/benchmarks/cycle-06-codeblock-regression.md`에 측정 + 사이클 5 baseline 대비 증가율(%) + 합격 판정. shiki 첫 페인트 p50도 동일 보고서에 기록 (게이트 아님). **사이클 5 보고서와 동일 환경(M1/M2 16GB 충전 중) + 마스터 플랜 4.7.3 표준 적용** | 수동 1회 |
| AC9 | MarkdownRenderer props 변경 없음 (`{ document: MarkdownDocument }`만), CodeBlock props는 사이클 2 `{ code, language }` 유지 (내부 상태만 추가) | pnpm typecheck |

---

## 설계 제약

- **shiki 모듈 싱글턴**: `createHighlighter` Promise를 모듈 스코프에 캐시 — 비동기 초기화 비용(테마+언어 번들 wasm 로드) 1회로 한정. React render path는 동기이므로 `useEffect`로 비동기 적용. 호출 단위 인스턴스 금지
- **shiki innerHTML 주입 안전성**: 사용자 마크다운 텍스트는 markdown-it `html: false` 토큰화로 텍스트 노드만 추출 → `token.content`로 shiki에 전달. shiki 출력은 `<span style="color:...">` 트리, 외부 입력 미혼입. CSP `style-src 'unsafe-inline'`(P2-2, 결정 13) 의존. DOMPurify는 사이클 7
- **테마 정의 위치**: `light-soft`/`dark-soft` JSON 객체를 코드로 동봉. 외부 .json 파일 import는 electron-vite ESM 호환 검증 비용 회피. dual theme 동시 등록 — Q5 결정형 (CSS 변수 토글로 재하이라이트 회피)
- **언어 번들 정적 등록**: `typescript`/`javascript`/`python`/`bash`/`json`/`markdown` 등 정적 6~8개만 등록. lazy `loadLanguage`는 사이클 9 (마스터 플랜 4.2.3 트레이드오프 갱신 — P6-5)
- **인라인 재귀 통일 (부채 ①)**: `strong_open`/`em_open` 분기는 `s_open`과 동일 재귀 패턴(`renderInlineTokens`)으로 통일. text 토큰 단순 추출은 `**[link](url)**` 등 중첩 마크업 손실 — 사이클 5 누락 회귀
- **renderTokens 비공개화 (부채 ② / P6-1)**: adapter.ts 모듈 스코프에 `WeakMap<MarkdownDocument, readonly Token[]>` 캐시 + `getCachedTokens(doc)` helper. `parseMarkdown` 호출 시 토큰 캐시. miss 시 `new MarkdownIt(...).parse(rawText, {})` 1회 fallback. **`MarkdownDocument` 타입 0 변경** — 마스터 플랜 4.2/4.6 "도메인 모델에 라이브러리 AST를 노출하지 않는다" 원칙 준수. preload IPC 경로 무변경, 사이클 8 자유도 보존
- **CodeBlock props 동결**: `{ code, language }` 유지 (사이클 2). 복사 버튼·hover·shiki 적용 상태는 모두 컴포넌트 내부 state — 외부 인터페이스 무변경 (사이클 9 가상화 안전성)
- **codeblock.css 토큰 재사용**: 배경 `--code-bg`, 텍스트 `--text`, 언어 라벨/복사 버튼 색상도 기존 변수만 사용. 신규 CSS 변수 도입 금지 (사이클 4 토큰 동결)
- **부채 ③ 데모 압축 + ⑤ 표 대비**: App `EMPTY_HINT_TEXT`는 사용 안내 + 코드 블록 3종(ts/python/plain) 시각 검증 우선. 사이클 5 GFM 데모는 표 1·체크박스 2줄로 축소. gfm.css 셀 테두리는 `--code-bg`(라이트) / `--bg` 보강 색(다크)으로 WCAG AA 충족
- **부채 ④ 검토 보고만**: `docs/notes/cycle-06-html-inline-review.md`에 1~2문단 결론 (코드 변경 없음). 사이클 7 DOMPurify spec에서 본 결론 참조 의무
- **회귀 5초 초과 시 액션**: 본 사이클 게이트 통과 필수. shiki 첫 페인트는 게이트 아님(참고). 초과 시 9.1.5에 따라 사이클 9 앞당김 — 본 사이클에서 가상화·lazy 도입 금지
- **i18n 직표기 허용**: 복사 버튼 `aria-label="코드 복사"`·tooltip 한국어 직표기. i18next는 사이클 10
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 에러 — shiki 로드 실패 `console.warn` + plain fallback, 클립보드 거부 `console.warn`. 접근성 — `<pre><code>` 의미론 유지, 복사 버튼 Tab 포커스. 보안 — `html: false` + shiki 토큰화 결과만 innerHTML. 로컬 자산 정책(P2-7) — 본 사이클 비범위. macOS 분기 — 해당 없음 (clipboard API 공통)

---

## 신규 의존성

```json
{ "dependencies": { "shiki": "^1.24.0" } }
```

shiki 1.24+ ESM 단일 패키지. `@shikijs/core` + `@shikijs/langs-precompiled` 자동 포함. 정확한 patch는 구현자가 npm 최신 1.x로 결정.

---

## 미룬 것

- 사이클 7: 이미지·blockquote·DOMPurify allowlist에 `<span style>` shiki 출력 통과 + 부채 ④ 검토 결과 적용·`mddolphin-asset://`·H5/H6 렌더 결정·html_inline 우회 패턴
- 사이클 8: TOC 사이드바
- 사이클 9: react-virtuoso 가상화, shiki lazy `loadLanguage`, 1만 줄 1초 본격 측정, 인쇄 미디어 쿼리, WCAG AA 본격 측정 보고서, shiki 캐시(`Map<code+lang, html>`)가 가상화 mount/unmount 시 필요한지 측정
- 사이클 10: 사용자 설정·테마 override UI·i18next·에러 UX

---

## Open Questions

- Q4: shiki 1.x `createHighlighter` vs 레거시 `getHighlighter` 시그니처 — 구현 시 npm 최신 패치 README 확인. 본 스펙은 `createHighlighter` 가정

---

## 변경 이력

| 라운드 | 항목 | 내용 |
|--------|------|------|
| P6-1 | 부채 ② 처리 방식 | `MarkdownDocument`에 `tokens` 필드 추가 → adapter.ts 모듈 스코프 `WeakMap<MarkdownDocument, readonly Token[]>` 캐시 + `getCachedTokens` helper로 변경 (마스터 플랜 4.2/4.6 원칙 준수, 도메인 타입 무변경) |
| P6-2 | TDD R2 확장 | adapter 인라인 재귀(부채 ①)에 export 동결 회복(부채 ②) 합산. R3 신설 대신 R2 확장 채택 — 두 작업이 모두 adapter 모듈에 집중 |
| P6-3 | 미룬 것 사이클 7 인계 보강 | "DOMPurify allowlist에 `<span style>` shiki 출력 통과 + 부채 ④ 검토 결과 적용" 명시 |
| P6-4 | Q5 결정형 전환 | "shiki 1.x dual theme 출력 채택 (`themes: { light, dark }`), CSS 변수 토글로 재하이라이트 회피. `--shiki-dark` 인라인 변수 포함 시 dual, 아니면 ThemeContext fallback" — Open Questions에서 제거, 설계 제약/AC6에 흡수 |
| P6-5 | doc-writer 인계 | `docs/plans/01-decisions.md` 4.2.3 트레이드오프 문구를 "정적 6~8개 등록, lazy `loadLanguage`는 사이클 9"로 갱신 요청 |
| P6-6 | preload 갱신 불필요 | P6-1 채택으로 자동 해소 (`MarkdownDocument` 타입 무변경 → IPC 직렬화 경로 무영향) |
| P6-8 | AC8 측정 환경 명시 | "사이클 5 보고서와 동일 환경(M1/M2 16GB 충전 중) + 마스터 플랜 4.7.3 표준 적용" 1구 추가 |
| P6-9 | 의무 기재 항목 보강 | "로컬 자산 정책(P2-7) — 본 사이클 비범위" 1구 추가 |
| P6-10 | 미룬 것 사이클 9 보강 | "shiki 캐시(`Map<code+lang, html>`)가 가상화 mount/unmount 시 필요한지 측정" 1구 추가 |
