# html_inline 우회 패턴 검토 (사이클 6 부채 ④)

## 현재 패턴 분석

`MarkdownRenderer.tsx`의 `renderInlineTokens`에서 `html_inline` 토큰을 처리하는 `parseCheckboxHtmlInline` 함수는 markdown-it-task-lists 플러그인이 생성하는 `<input class="task-list-item-checkbox" ...>` 패턴만을 React `<input>`으로 변환한다. 이 변환은 **markdown-it 파싱 → 토큰 순회 → React 컴포넌트 생성** 단계에서 이루어지며, `type="checkbox"` 속성 존재 여부로 체크박스 여부를 판별하고 그 외 `html_inline`은 조용히 무시(`html: false` 정책)한다. 즉 task-list 체크박스는 사용자 마크다운 원본 HTML이 아니라 markdown-it 플러그인이 토큰 수준에서 주입한 구조이므로, DOMPurify가 개입할 `innerHTML` 경로를 애초에 거치지 않는다.

## 사이클 7 DOMPurify 도입 영향

사이클 7에서 DOMPurify allowlist가 필요한 대상은 shiki 출력 `<pre class="shiki">...<span style="color:...">...</span>...</pre>` 트리다. task-list checkbox 변환은 React 컴포넌트 트리에서 직접 완결되므로 DOMPurify 입력에 포함되지 않으며 영향을 받지 않는다. 따라서 사이클 7 DOMPurify 도입 시 allowlist에 추가할 항목은 shiki `<span style>` 인라인 변수(`--shiki-light`, `--shiki-dark`)와 `<pre>`/`<code>` 태그뿐이며, `html_inline` 체크박스 경로는 별도 결정이 불필요하다. **코드 변경 없음.**
