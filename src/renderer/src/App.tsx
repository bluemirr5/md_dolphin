// App.tsx — 사이클 4: ThemeProvider 합류
// - ThemeProvider(외) → DocumentProvider(내) 순서 고정 (P3-6, P4-1)
// - theme.css·typography.css 글로벌 CSS import
// - 사이클 3 DropZone·⌘O·IPC 유지
import { useEffect } from 'react';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';
import { DocumentProvider, useDocumentStore } from './store/document-store.factory';
import { ThemeProvider } from './context/ThemeProvider';
import { DropZone } from './components/DropZone';
import type { DocumentData } from './store/document-store';
import './styles/theme.css';
import './styles/typography.css';
import './styles/gfm.css';
import './styles/codeblock.css';
import './styles/blockquote.css';
import './styles/image.css';

// 빈 문서 — 파일 미로드 시 안내 메시지 표시용
const EMPTY_HINT_TEXT = `\
# md_dolphin

.md 파일을 열거나 여기에 드래그 & 드롭하세요.

- **⌘O** — 파일 열기 다이얼로그
- **드래그 & 드롭** — 마크다운 파일을 이 창에 드롭

## 이미지 미리보기 (사이클 7)

![원격 이미지 예시](https://via.placeholder.com/320x180?text=Remote+Image)

## 인용문 (사이클 7)

> 좌측 accent bar가 있는 인용문입니다.
>
> > 중첩 인용문 — 들여쓰기 누적

## 외부 링크 (사이클 7)

[GitHub](https://github.com) — 클릭 시 시스템 브라우저로 열림. hover 시 URL 툴팁.

## 코드·GFM (사이클 5·6)

\`\`\`typescript
const greeting: string = "안녕하세요";
console.log(greeting);
\`\`\`

| 기능 | 상태 |
|:-----|:----:|
| 표 | ✅ |
| 인용문 | ✅ |

- [x] 사이클 5 GFM
- [x] 사이클 6 shiki
- [x] 사이클 7 image/link/quote
`;

const EMPTY_DOCUMENT = parseMarkdown(EMPTY_HINT_TEXT, undefined);

function AppInner(): JSX.Element {
  const document = useDocumentStore((s) => s.document);
  const setDocument = useDocumentStore((s) => s.setDocument);

  // main 메뉴 ⌘O → main이 api:openFile IPC를 push하면 여기서 처리
  useEffect(() => {
    const cleanup = window.api.onDocumentOpened((filePath: string) => {
      void window.api.readFile(filePath, undefined).then((result) => {
        if (result.ok) {
          setDocument(result.document);
        } else {
          console.error('[App] 파일 읽기 실패:', result.code, result.message);
        }
      });
    });
    return cleanup;
  }, [setDocument]);

  // ⌘O 키보드 단축키 — 메뉴와 중복이지만 렌더러 직접 처리도 지원
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
        event.preventDefault();
        void window.api.openFile().then((result) => {
          if (result?.ok) {
            setDocument(result.document);
          }
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDocument]);

  function handleFileDrop(doc: DocumentData): void {
    setDocument(doc);
  }

  const rendererDocument = document
    ? parseMarkdown(document.rawText, document.path)
    : EMPTY_DOCUMENT;

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <MarkdownRenderer document={rendererDocument} />
    </DropZone>
  );
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <DocumentProvider>
        <AppInner />
      </DocumentProvider>
    </ThemeProvider>
  );
}

export default App;
