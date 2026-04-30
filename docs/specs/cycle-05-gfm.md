# 사이클 5 — GFM 요소 렌더링 강화

**상태**: Ready
**선행**: 사이클 4 커밋 `a830809` 그린 (typecheck/lint/test/build 통과)
**TDD 정책**: R1~R2 TDD 의무 (adapter 옵션 동결·task list 보안). Strikethrough/Table/List 노드·시각 fixture·1만 줄 회귀 측정은 사후

---

## DoD — 사이클 종료 조건

**A. 필수 (Definition of Done)**

- [ ] `src/renderer/src/markdown/adapter.ts` 갱신 — markdown-it 옵션 `{ html: false, linkify: true, typographer: false }` (linkify만 false→true). `.use(markdownItTaskLists, { enabled: false, label: false })` 등록. 신규 토큰(table_*/tr_*/td_*/th_*/s_*/bullet_list_*/ordered_list_*/list_item_*) → React 변환 분기 추가. 호출 단위 인스턴스 생성 원칙 유지 (사이클 2 동결)
- [ ] `src/renderer/src/markdown/nodes/Strikethrough.tsx` — `~~text~~` → `<del>{children}</del>`
- [ ] `src/renderer/src/markdown/nodes/Table.tsx` — `<table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>`. 셀 정렬은 `align-left|align-center|align-right` className으로 표현 (markdown-it 표 토큰의 `attrs[style]=text-align:*` 파싱)
- [ ] `src/renderer/src/markdown/nodes/List.tsx` — `<ul>` / `<ol>` 분기 (bullet_list / ordered_list 토큰)
- [ ] `src/renderer/src/markdown/nodes/ListItem.tsx` — `<li>`. task list 분기는 동일 컴포넌트에서 처리: markdown-it-task-lists가 li_open 토큰에 `class="task-list-item"` + `<input type="checkbox" disabled [checked]>` 인라인을 prepend → ListItem이 detect하여 `<li class="task-list-item"><input disabled ...>` 렌더
- [ ] `src/renderer/src/markdown/nodes/Link.tsx` 재사용 — autolink는 별도 컴포넌트 신설하지 않음 (linkify가 link_open/link_close 토큰을 동일하게 emit). target=_blank rel=noopener noreferrer 일관 (사이클 2 동결)
- [ ] `src/renderer/src/styles/gfm.css` 신규 — table 테두리/셀 패딩, del 색상, task-list-item input 줄간격·marker none, 정렬 className 3종. CSS 변수 `--bg`/`--text`/`--quote-bar`/`--code-bg` 재사용 (사이클 4 토큰)
- [ ] `src/renderer/src/main.tsx` (또는 styles 배럴) 갱신 — `gfm.css` import
- [ ] `src/preload/api.d.ts` / IPC — 변경 없음 (UI 전용 사이클)
- [ ] `tests/fixtures/gfm-sample.md` — 표(정렬 3종 모두) + 체크박스(checked/unchecked) + 취소선 + autolink(angle bracket / 일반 https) + ul/ol 중첩 포함. 한글·영문 혼합 (시각 회귀용)
- [ ] `tests/markdown/adapter-options.test.ts` — TDD: parseMarkdown이 사용하는 markdown-it 옵션 단언 (`html: false`, `linkify: true`, `typographer: false`), `markdown-it-task-lists` plugin 등록 확인 (rendered 결과에 `class="task-list-item"` 발생으로 간접 검증)
- [ ] `tests/markdown/task-list.test.tsx` — TDD: `- [ ]`/`- [x]` 두 케이스 모두 `<input type="checkbox" disabled>` 생성, checked 속성만 차이. label 옵션 미사용 (input이 li 첫 자식 직전 또는 li 직속 자식)
- [ ] `tests/markdown/gfm.test.tsx` — 사후 RTL: 표 thead/tbody 구조, 정렬 className 3종, `<del>`, ul/ol/li, autolink가 `<a target=_blank rel="noopener noreferrer">`로 렌더
- [ ] `App.tsx` 또는 인라인 데모 갱신(선택) — gfm-sample.md 일부를 데모 rawText에 포함 (시각 검증 편의)
- [ ] pnpm typecheck / lint / test / build 전부 그린

**B. 완비 (사이클 6 시작 전)**

- [ ] `docs/benchmarks/cycle-05-gfm-regression.md` — `tests/fixtures/large-10k.md` 1만 줄 parseMarkdown 회귀 측정. (a) 전체 / (b) 토큰화 / (c) 토큰→React 변환 3분할 + p50/p95 + 사이클 2 baseline 대비 증가율. **합격 판정: 전체 p50 ≤ 5초** (마스터 플랜 7.1 P2-5). 초과 시 마스터 플랜 9.1.5에 따라 사이클 9 가상 스크롤 앞당김 트리거

---

## TDD 순서

| 라운드 | 대상 | 핵심 |
|--------|------|------|
| R1 | adapter 옵션 동결 + plugin 등록 | `html: false` 유지·`linkify: true` 적용·taskLists 등록 동시 단언 |
| R2 | task list 체크박스 보안 | `- [x]`/`- [ ]` 모두 `<input disabled>`, checked만 분기 |
| 사후 | Strikethrough·Table·List·ListItem 노드, gfm.css, gfm-sample fixture, autolink Link 재사용 검증, 1만 줄 회귀 측정 | AC3~AC9 |

---

## 인수 기준

| AC | 조건 | 검증 |
|----|------|------|
| AC1 | parseMarkdown이 생성한 markdown-it 인스턴스 옵션: `html === false`, `linkify === true`, `typographer === false`. `markdown-it-task-lists` plugin 등록됨 (`- [ ]` 입력 시 `class="task-list-item"` 발생) | pnpm test |
| AC2 | `- [ ] todo` / `- [x] done` 두 입력 모두 `<input type="checkbox" disabled>` 생성. `[x]`만 `checked`, `[ ]`은 unchecked. disabled는 양쪽 동일 (편집 불가) | pnpm test RTL |
| AC3 | `\| h1 \| h2 \|`+`\|---\|---:\|` → `<table><thead><tr><th>...</th><th class="align-right">...` / `<tbody><tr><td>...</td></tr>` 구조. 정렬 셀은 `align-left`/`align-center`/`align-right` className | pnpm test RTL |
| AC4 | `~~strike~~` → `<del>strike</del>` | pnpm test RTL |
| AC5 | ul/ol/li 기본 렌더링: `- a\n- b` → `<ul><li>a</li><li>b</li></ul>`, `1. a\n2. b` → `<ol><li>...`. nested(`- a\n  - b`) → `<ul><li>a<ul><li>b</li></ul></li></ul>`. ordered start 보존(`3. a\n4. b` → `<ol start="3">`) | pnpm test RTL |
| AC6 | autolink 두 형식 모두 `<a target=_blank rel="noopener noreferrer">`: `<https://example.com>` (angle), `https://example.com` (linkify bare) | pnpm test RTL |
| AC7 | `tests/fixtures/large-10k.md` parseMarkdown 1만 줄 회귀 (a) 전체 p50 ≤ **5초** — `docs/benchmarks/cycle-05-gfm-regression.md`에 측정 + 합격 판정 + **사이클 2 baseline 대비 증가율(%)** 기록. 초과 시 마스터 플랜 9.1.5 트리거 (사이클 9 앞당김) | 수동 1회 |
| AC8 | `tests/fixtures/gfm-sample.md` `pnpm dev` 시각 정상 — 표 테두리·정렬, 체크박스 disabled, del 줄긋기, autolink 클릭 외부 브라우저 (사이클 3 openExternal) | 수동 1회 |
| AC9 | MarkdownRenderer props 변경 없음 (`{ document: MarkdownDocument }`만), `parseMarkdown` 외부 export 변경 없음 — 사이클 2 인터페이스 동결 유지 | pnpm typecheck |

---

## 설계 제약

- **markdown-it 옵션 변경 1지점**: `linkify: false → true`만 변경. `html: false`는 P2-8 의무로 동결, `typographer: false` 유지 (마스터 플랜 9.1). adapter.ts 외부에서 옵션 노출·재설정 금지 — 사이클 7 DOMPurify 도입 전 allowlist 확장 차단
- **호출 단위 인스턴스 + 플러그인 등록**: 사이클 2 동결 유지. `parseMarkdown` 호출마다 `new MarkdownIt(opts).use(taskLists, {...})` — 모듈 싱글턴 금지 (전역 옵션 오염·테스트 격리 확보)
- **markdown-it-task-lists 옵션**: `enabled: false` (input disabled, 편집 차단), `label: false` (label 래핑 비활성). 보안·UX 결함 방지 — input 활성화 시 사용자 입력이 모델에 반영되지 않으므로 일관성 깨짐
- **표 정렬 className**: `align-left` / `align-center` / `align-right` 단순 키. markdown-it 표 토큰의 `attrs`에서 `style="text-align:*"` 파싱 → className 변환. inline style 그대로 전달 금지 (CSP `style-src` 동결 정책 일관)
- **autolink는 Link.tsx 재사용**: linkify가 link_open/link_close 토큰을 동일하게 emit — 별도 Autolink 컴포넌트 금지. target=_blank rel="noopener noreferrer" 일관 (사이클 2)
- **ul/ol/li 사이클 5 첫 도입**: 사이클 2는 미포함 (task list 전제로 자연 합류). `<ol start="N">` 보존(`3. a\n4. b` → `<ol start="3">`), nested list(ul 안 ol·ol 안 ul)는 토큰 재귀 처리. blockquote·이미지는 사이클 7
- **Block 내부 표현 동결**: `{ kind, element, key }` 유지. Table/List/ListItem/Strikethrough 모두 동일 키 형태 — 사이클 9 react-virtuoso 교체 안전성 확보
- **MarkdownRenderer props 동결**: 사이클 2 인터페이스 (`{ document: MarkdownDocument }`) 변경 금지. 신규 노드는 adapter 내부 변환에서 흡수
- **gfm.css 토큰 재사용**: 표 배경·테두리는 `--bg`/`--code-bg`, del 색상은 `--text` opacity, task-list marker none. 신규 CSS 변수 도입 금지 (사이클 4 키 동결)
- **fixture 분포 유지**: 1만 줄 회귀는 사이클 2 baseline의 `large-10k.md` (헤딩 5%/문단 70%/인라인 15%/코드 10%, GFM 미포함) 그대로. linkify 활성화가 비-GFM 텍스트 파싱에 미치는 영향 검증이 목적 — GFM-heavy 측정은 본 사이클 비범위. `gfm-sample.md`는 시각 회귀 전용
- **회귀 5초 초과 시 액션**: 사이클 5 자체는 게이트 통과 필수. 초과 시 마스터 플랜 9.1.5에 따라 사이클 9 가상 스크롤 앞당김 트리거 — 본 사이클에서 가상화 도입 금지
- **0.5일 스파이크 선행**: 사이클 시작 전 PoC로 markdown-it 표 `attrs[style]` 정확한 위치, task-lists 플러그인 li 토큰 변형 형태 검증. 결과는 어댑터 분기 구현 시 반영 — 별도 산출물 금지
- **의무 기재 항목 압축 (마스터 플랜 6.7)**: 접근성 — `<th scope="col">` 의무, 체크박스는 `disabled` + li 본문 텍스트가 visible label 역할(별도 aria-label 불필요, label 옵션 false 일관). 보안 — `html: false` 유지, 신규 의존성 `markdown-it-task-lists`만 추가 (DOM 직접 조작 없음). 1만 줄 회귀는 AC7. i18n / 인쇄는 사이클 9~10
- **타입 미제공 시**: `@types/markdown-it-task-lists` 부재 시 `src/renderer/src/markdown/types/markdown-it-task-lists.d.ts`에 `declare module` 1파일 추가 (구현자 재량)

---

## 신규 의존성

```json
{
  "dependencies": { "markdown-it-task-lists": "^2.1.1" }
}
```

---

## 미룬 것

- 사이클 6: shiki 신택스 하이라이팅 (CodeBlock.language props는 사이클 2에서 확보)
- 사이클 7: 이미지·blockquote·DOMPurify·`mddolphin-asset://`·H5/H6 렌더 결정
- 사이클 8: TOC 사이드바
- 사이클 9: react-virtuoso 가상화, 1만 줄 1초 본격 측정, 인쇄 미디어 쿼리
- 사이클 10: 사용자 설정·테마 override UI·i18next·에러 UX

---

## Open Questions

- Q3: linkify 한글 도메인/IDN 처리 — 사이클 7 외부링크 정책 검토 시 재확인 (현 사이클은 영문/punycode만 검증)

---

## 변경 이력

| 라운드 | 항목 | 내용 |
|--------|------|------|
| P5-1 | 설계 제약 ul/ol/li bullet | `<ol start="N">` 보존·nested list 토큰 재귀 처리 명시 |
| P5-2 | AC5 | nested(`- a\n  - b`)·ordered start 보존 케이스 보강 |
| P5-3 | 설계 제약 의무 기재 | 체크박스 visible label = li 본문 텍스트 (별도 aria-label 불필요) 명시 |
| P5-4 | AC7 | 사이클 2 baseline 대비 증가율(%) 기록 의무 추가 |
| P5-5 | 스파이크 결과 | Q1: list_item_open attrs에 class="task-list-item", inline children[0]에 html_inline으로 checkbox prepend (html:false에서 미렌더 → React input으로 직접 변환). Q2: th_open/td_open 양쪽 모두 attrs[["style","text-align:*"]] 일관 부여 |
