// App.tsx — 사이클 8: TOC 사이드바 합류
// - <DropZone> 내부 layout: <aside>(SidebarView) + <main>(MarkdownRenderer) 2-column flex
// - ⌘1: 사이드바 토글, ⌘2: 본문 포커스
// - useScrollSpy: IntersectionObserver로 activeAnchor 추적
// CR10-4: ErrorState/LargeFileWarning 실제 앱 경로 연결
// 사이클 11a (CR10-6): zoom-bridge cleanup useEffect 패턴으로 App unmount 시 dispose 보장
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type VirtuosoHandle } from 'react-virtuoso';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';
import { DocumentProvider, useDocumentStore } from './store/document-store.factory';
import { ThemeProvider } from './context/ThemeProvider';
import { DropZone } from './components/DropZone';
import { SidebarView } from './components/SidebarView';
import { TitleBar } from './components/TitleBar';
import { ErrorState } from './components/ErrorState';
import { LargeFileWarning } from './components/LargeFileWarning';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { useScrollSpy } from './components/useScrollSpy';
import { useSidebarVisible, useSidebarToggle } from './store/sidebar-store';
import { useWideModeEnabled, useWideModeToggle } from './store/wide-mode-store';
import { useRecentFilesPush } from './store/recent-files-store';
import { initZoomBridge } from './zoom-bridge';
import type { DocumentData } from './store/document-store';
import type { FileErrorKind } from '../../main/file-service';
import './styles/theme.css';
import './styles/typography.css';
import './styles/gfm.css';
import './styles/codeblock.css';
import './styles/blockquote.css';
import './styles/image.css';
import './styles/welcome.css';

/** 구 API OpenedFileResult의 code를 FileErrorKind로 변환 */
function openedFileCodeToKind(code: string): FileErrorKind {
  if (code === 'EACCES' || code === 'OUTSIDE_BASE_DIR') return 'permission';
  if (code === 'ENOENT') return 'io';
  return 'io';
}

/** 파일 크기(bytes) → MB 소수점 1자리 */
function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

interface PendingLargeFile {
  filePath: string;
  sizeMb: number;
}

interface FileErrorState {
  kind: FileErrorKind;
  // exactOptionalPropertyTypes: 명시적 undefined 허용을 위해 '| undefined' 선언
  pathHint: string | undefined;
  /** 재시도 시 다시 열어야 할 경로 */
  retryPath: string | undefined;
}

function AppInner(): JSX.Element {
  const document = useDocumentStore((s) => s.document);
  const setDocumentRaw = useDocumentStore((s) => s.setDocument);
  const pushRecent = useRecentFilesPush();
  // setDocument 래퍼 — 문서 로드 시 최근 파일 목록도 갱신 (WelcomeScreen 노출용)
  const setDocument = useCallback((doc: DocumentData) => {
    setDocumentRaw(doc);
    pushRecent(doc.path);
  }, [setDocumentRaw, pushRecent]);
  const visible = useSidebarVisible();
  const toggle = useSidebarToggle();
  const wide = useWideModeEnabled();
  const toggleWide = useWideModeToggle();

  // 사이클 11a (CR10-6): zoom-bridge IPC 리스너 구독 + unmount 시 cleanup 보장
  useEffect(() => initZoomBridge(), []);

  // CR10-4: 에러 상태 / LargeFileWarning 대기 상태
  const [fileError, setFileError] = useState<FileErrorState | null>(null);
  const [pendingLargeFile, setPendingLargeFile] = useState<PendingLargeFile | null>(null);

  // 사이클 14: 업데이트 알림 (세션 dismiss 전용 — localStorage 영구 저장 불필요)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => window.api.onUpdateAvailable((v) => setUpdateVersion(v)), []);

  // CR8-2: document가 바뀔 때만 parseMarkdown 재실행 (사이드바 토글 등 무관 렌더 차단)
  // document가 null이면 null 반환 — WelcomeScreen 분기에서 MarkdownRenderer 미렌더
  const rendererDocument = useMemo(
    () => (document ? parseMarkdown(document.rawText, document.path) : null),
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

  const { activeAnchor, suspendScrollSpy } = useScrollSpy(
    rendererDocument?.headings ?? [],
    articleRef,
  );

  // CR9.2-2: MarkdownRenderer의 내부 jump 핸들러(anchor→blockIndex 변환)를 외부에 노출.
  // MarkdownRenderer가 blocks 배열 인덱스를 직접 알고 있으므로
  // App.tsx가 tokenIndex로 잘못 접근하는 문제를 해결한다.
  // SidebarView → handleJump → rendererJumpRef.current(anchor) → MarkdownRenderer 내부 처리.
  const rendererJumpRef = useRef<((anchor: string) => void) | undefined>(undefined);

  /**
   * 파일 경로를 받아 stat 확인 → too-large이면 모달 대기,
   * 정상이면 readFile → DocumentData 설정 또는 ErrorState 표시.
   */
  const openFilePath = useCallback(async (filePath: string): Promise<void> => {
    // stat 사전 확인 — fileStat이 없는 환경(테스트)에서는 skip
    try {
      const stat = await window.api.fileStat(filePath);
      if (stat.tooLarge) {
        setPendingLargeFile({ filePath, sizeMb: bytesToMb(stat.size) });
        return;
      }
    } catch {
      // stat 실패 시 readFile로 진행 (ENOENT 등은 readFile에서 재처리)
    }

    const result = await window.api.readFile(filePath, undefined);
    if (result.ok) {
      setFileError(null);
      setDocument(result.document);
    } else {
      setFileError({
        kind: openedFileCodeToKind(result.code),
        pathHint: filePath,
        retryPath: filePath,
      });
    }
  }, [setDocument]);

  // ⌘O 다이얼로그를 띄워 파일 선택 → setDocument 또는 ErrorState 표시
  // 키보드 단축키 / WelcomeScreen 드롭존 클릭 양쪽에서 재사용
  const openFileViaDialog = useCallback(async (): Promise<void> => {
    const result = await window.api.openFile();
    if (result?.ok) {
      setFileError(null);
      setDocument(result.document);
    } else if (result && !result.ok) {
      setFileError({
        kind: openedFileCodeToKind(result.code),
        pathHint: undefined,
        retryPath: undefined,
      });
    }
  }, [setDocument]);

  // main 메뉴 ⌘O → main이 api:openFile IPC를 push하면 여기서 처리
  useEffect(() => {
    const cleanup = window.api.onDocumentOpened((filePath: string) => {
      void openFilePath(filePath);
    });
    return cleanup;
  }, [openFilePath]);

  // main 메뉴 ⌘1/⌘2/⌘3 → main이 IPC push → renderer에서 수신
  useEffect(() => {
    const cleanupToggle = window.api.onToggleSidebar(() => {
      toggle();
    });
    const cleanupFocus = window.api.onFocusArticle(() => {
      mainNodeRef.current?.focus();
    });
    const cleanupWide = window.api.onToggleWide(() => {
      toggleWide();
    });
    return () => {
      cleanupToggle();
      cleanupFocus();
      cleanupWide();
    };
  }, [toggle, toggleWide]);

  // 키보드 단축키 — ⌘O·⌘1·⌘2
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!event.metaKey) return;

      if (event.key === 'o') {
        event.preventDefault();
        void openFileViaDialog();
      } else if (event.key === '1') {
        event.preventDefault();
        toggle();
      } else if (event.key === '2') {
        event.preventDefault();
        mainNodeRef.current?.focus();
      } else if (event.key === '3') {
        event.preventDefault();
        toggleWide();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFileViaDialog, toggle, toggleWide]);

  function handleFileDrop(doc: DocumentData): void {
    setFileError(null);
    setDocument(doc);
  }

  function handleFileDropError(kind: FileErrorKind, pathHint?: string): void {
    setFileError({ kind, pathHint, retryPath: pathHint });
  }

  // SidebarView의 onJump → MarkdownRenderer 내부 핸들러 경유
  // P8-5: TOC 클릭 시 scroll-spy 200ms 일시 정지 (깜빡임 방지)
  function handleJump(anchor: string): void {
    suspendScrollSpy(anchor);
    rendererJumpRef.current?.(anchor);
  }

  // LargeFileWarning "계속" 클릭 — too-large 경고 무시하고 강제 읽기
  async function handleLargeFileContinue(): Promise<void> {
    if (!pendingLargeFile) return;
    const { filePath } = pendingLargeFile;
    setPendingLargeFile(null);
    const result = await window.api.readFile(filePath, undefined);
    if (result.ok) {
      setFileError(null);
      setDocument(result.document);
    } else {
      setFileError({
        kind: openedFileCodeToKind(result.code),
        pathHint: filePath,
        retryPath: filePath,
      });
    }
  }

  function handleLargeFileCancel(): void {
    setPendingLargeFile(null);
  }

  function handleErrorRetry(): void {
    const retryPath = fileError?.retryPath;
    setFileError(null);
    if (retryPath) {
      void openFilePath(retryPath);
    }
  }

  function handleErrorCancel(): void {
    setFileError(null);
  }

  return (
    <DropZone onFileDrop={handleFileDrop} onFileDropError={handleFileDropError}>
      {pendingLargeFile && (
        <LargeFileWarning
          filePath={pendingLargeFile.filePath}
          fileSizeMb={pendingLargeFile.sizeMb}
          onContinue={() => { void handleLargeFileContinue(); }}
          onCancel={handleLargeFileCancel}
        />
      )}
      {fileError && (
        <ErrorState
          kind={fileError.kind}
          {...(fileError.pathHint !== undefined ? { pathHint: fileError.pathHint } : {})}
          {...(fileError.retryPath !== undefined ? { onRetry: handleErrorRetry } : {})}
          onCancel={handleErrorCancel}
        />
      )}
      <TitleBar />
      {updateVersion && !updateDismissed && (
        <UpdateBanner version={updateVersion} onDismiss={() => setUpdateDismissed(true)} />
      )}
      <div className={wide ? 'md-layout is-wide' : 'md-layout'}>
        {document && rendererDocument && visible && (
          <aside className="md-sidebar">
            <SidebarView
              outline={rendererDocument.outline}
              activeAnchor={activeAnchor}
              onJump={handleJump}
            />
          </aside>
        )}
        <main className="md-main" ref={mainCallbackRef} tabIndex={-1}>
          {rendererDocument ? (
            <MarkdownRenderer
              document={rendererDocument}
              virtualize
              virtuosoRef={virtuosoRef}
              articleRef={articleRef}
              onJumpReady={(fn) => { rendererJumpRef.current = fn; }}
            />
          ) : (
            <WelcomeScreen
              onOpenFile={() => { void openFileViaDialog(); }}
              onOpenRecent={(path) => { void openFilePath(path); }}
            />
          )}
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
