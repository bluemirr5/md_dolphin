// App.tsx — 사이클 8: TOC 사이드바 합류
// - <DropZone> 내부 layout: <aside>(SidebarView) + <main>(MarkdownRenderer) 2-column flex
// - ⌘1: 사이드바 토글, ⌘2: 본문 포커스
// - useScrollSpy: IntersectionObserver로 activeAnchor 추적
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type VirtuosoHandle } from 'react-virtuoso';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';
import { DocumentProvider, useDocumentStore } from './store/document-store.factory';
import { ThemeProvider } from './context/ThemeProvider';
import { DropZone } from './components/DropZone';
import { SidebarView } from './components/SidebarView';
import { SidebarToggleButton } from './components/SidebarToggleButton';
import { useScrollSpy } from './components/useScrollSpy';
import { useSidebarVisible, useSidebarToggle } from './store/sidebar-store';
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
- **⌘1** — 목차 사이드바 토글
- **⌘2** — 본문 포커스

## 이미지 미리보기 (사이클 7)

![원격 이미지 예시](https://via.placeholder.com/320x180?text=Remote+Image)

## 인용문 (사이클 7)

> 좌측 accent bar가 있는 인용문입니다.
>
> > 중첩 인용문 — 들여쓰기 누적

### 코드 예제 (사이클 6)

\`\`\`typescript
const greeting: string = "안녕하세요";
console.log(greeting);
\`\`\`

## 외부 링크 (사이클 7)

[GitHub](https://github.com) — 클릭 시 시스템 브라우저로 열림. hover 시 URL 툴팁.

## 코드·GFM (사이클 5·6)

| 기능 | 상태 |
|:-----|:----:|
| 표 | ✅ |
| 인용문 | ✅ |
| 목차 사이드바 | ✅ |

- [x] 사이클 5 GFM
- [x] 사이클 6 shiki
- [x] 사이클 7 image/link/quote
- [x] 사이클 8 TOC 사이드바
`;

const EMPTY_DOCUMENT = parseMarkdown(EMPTY_HINT_TEXT, undefined);

function AppInner(): JSX.Element {
  const document = useDocumentStore((s) => s.document);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const visible = useSidebarVisible();
  const toggle = useSidebarToggle();
  // CR8-2: document가 바뀔 때만 parseMarkdown 재실행 (사이드바 토글 등 무관 렌더 차단)
  const rendererDocument = useMemo(
    () => (document ? parseMarkdown(document.rawText, document.path) : EMPTY_DOCUMENT),
    [document],
  );

  // CR8-1: ref callback 패턴 — article DOM이 실제로 마운트/교체될 때 articleRef를 안전하게 갱신한다.
  // useEffect + 의존성 배열 없음 방식은 매 렌더마다 실행되므로 ref callback으로 교체한다.
  // mainNodeRef: ⌘2 포커스용 HTMLElement 참조 (ref callback으로 유지)
  const mainNodeRef = useRef<HTMLElement | null>(null);
  // CR9.2-2: Element → HTMLElement — MarkdownRenderer의 articleRef Ref<HTMLElement>와 타입 통일
  const articleRef = useRef<HTMLElement | null>(null);
  // CR9-6: 가상화 환경 anchor 점프 폴백용 VirtuosoHandle
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const mainCallbackRef = useCallback((node: HTMLElement | null) => {
    mainNodeRef.current = node;
    articleRef.current = node ? node.querySelector('article') : null;
  }, []);

  const activeAnchor = useScrollSpy(rendererDocument.headings, articleRef);

  // CR9.2-2: MarkdownRenderer의 내부 jump 핸들러(anchor→blockIndex 변환)를 외부에 노출.
  // MarkdownRenderer가 blocks 배열 인덱스를 직접 알고 있으므로
  // App.tsx가 tokenIndex로 잘못 접근하는 문제를 해결한다.
  // SidebarView → handleJump → rendererJumpRef.current(anchor) → MarkdownRenderer 내부 처리.
  const rendererJumpRef = useRef<((anchor: string) => void) | undefined>(undefined);

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

  // main 메뉴 ⌘1/⌘2 → main이 IPC push → renderer에서 수신
  useEffect(() => {
    const cleanupToggle = window.api.onToggleSidebar(() => {
      toggle();
    });
    const cleanupFocus = window.api.onFocusArticle(() => {
      mainNodeRef.current?.focus();
    });
    return () => {
      cleanupToggle();
      cleanupFocus();
    };
  }, [toggle]);

  // 키보드 단축키 — ⌘O·⌘1·⌘2
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!event.metaKey) return;

      if (event.key === 'o') {
        event.preventDefault();
        void window.api.openFile().then((result) => {
          if (result?.ok) {
            setDocument(result.document);
          }
        });
      } else if (event.key === '1') {
        event.preventDefault();
        toggle();
      } else if (event.key === '2') {
        event.preventDefault();
        mainNodeRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDocument, toggle]);

  function handleFileDrop(doc: DocumentData): void {
    setDocument(doc);
  }

  // SidebarView의 onJump → MarkdownRenderer 내부 핸들러 경유
  function handleJump(anchor: string): void {
    rendererJumpRef.current?.(anchor);
  }

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className="md-layout">
        <SidebarToggleButton />
        {visible && (
          <aside className="md-sidebar">
            <SidebarView
              outline={rendererDocument.outline}
              activeAnchor={activeAnchor}
              onJump={handleJump}
            />
          </aside>
        )}
        <main className="md-main" ref={mainCallbackRef} tabIndex={-1}>
          <MarkdownRenderer
            document={rendererDocument}
            virtualize
            virtuosoRef={virtuosoRef}
            articleRef={articleRef}
            onJumpReady={(fn) => { rendererJumpRef.current = fn; }}
          />
        </main>
      </div>
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
