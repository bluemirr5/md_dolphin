// App.tsx — 사이클 3: 파일 열기 통합
// - DropZone 래핑
// - store 구독 (MarkdownRenderer에 prop으로 전달 — 설계 제약: MarkdownRenderer는 store 직접 구독 금지)
// - ⌘O 메뉴 응답 (api:openFile IPC 수신)
// - 사이클 2 DEMO_RAW_TEXT 제거
import { useEffect } from 'react';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';
import { DocumentProvider, useDocumentStore } from './store/document-store.factory';
import { DropZone } from './components/DropZone';
import type { DocumentData } from './store/document-store';

// 빈 문서 — 파일 미로드 시 안내 메시지 표시용
const EMPTY_HINT_TEXT = `\
# md_dolphin

.md 파일을 열거나 여기에 드래그 & 드롭하세요.

- **⌘O** — 파일 열기 다이얼로그
- **드래그 & 드롭** — 마크다운 파일을 이 창에 드롭
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
      <main
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '32px 24px',
          fontFamily:
            '-apple-system, "SF Pro Text", system-ui, "Apple SD Gothic Neo", sans-serif',
          color: '#1C1C1E',
          background: '#FAFAF7',
          minHeight: '100vh',
        }}
      >
        <MarkdownRenderer document={rendererDocument} />
      </main>
    </DropZone>
  );
}

function App(): JSX.Element {
  return (
    <DocumentProvider>
      <AppInner />
    </DocumentProvider>
  );
}

export default App;
