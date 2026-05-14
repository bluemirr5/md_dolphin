// App.tsx — 사이클 16: TabStore 통합
// - ThemeProvider → TabProvider → DocumentProvider 순서 고정 (D2)
// - TitleBar 아래 <TabBar> 행 추가
// - 진입점 3경로(⌘O/onDocumentOpened/DropZone) + ⌘O keydown 모두 openFlow 경유 (P16-6)
// - setDocument 래퍼의 pushRecent 제거 → openFlow 내부 소유 (P16-3)
// - onTabNext/onTabPrev/onTabClose listener 마운트
// - 마지막 탭 close 시 window.api.closeWindow() 호출 (D3)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type VirtuosoHandle } from 'react-virtuoso';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';
import { DocumentProvider, useDocumentStore } from './store/document-store.factory';
import { TabProvider, useTabStoreRef } from './store/tab-store.factory';
import { ThemeProvider } from './context/ThemeProvider';
import { DropZone } from './components/DropZone';
import { SidebarView } from './components/SidebarView';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { ErrorState } from './components/ErrorState';
import { LargeFileWarning } from './components/LargeFileWarning';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { useScrollSpy } from './components/useScrollSpy';
import { useSidebarVisible, useSidebarToggle } from './store/sidebar-store';
import { useWideModeEnabled, useWideModeToggle } from './store/wide-mode-store';
import { useOpenFlow } from './openFlow';
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

interface PendingLargeFile {
  filePath: string;
  sizeMb: number;
}

interface FileErrorState {
  kind: FileErrorKind;
  pathHint: string | undefined;
  retryPath: string | undefined;
}

function AppInner(): JSX.Element {
  const document = useDocumentStore((s) => s.document);
  const tabStore = useTabStoreRef();

  const visible = useSidebarVisible();
  const toggle = useSidebarToggle();
  const wide = useWideModeEnabled();
  const toggleWide = useWideModeToggle();

  // openFlow hook — 파일 열기 통합 진입점 (P16-6, P16-3)
  const { openFilePath, openFileViaDialog } = useOpenFlow();

  // 사이클 11a (CR10-6): zoom-bridge IPC 리스너 구독 + unmount 시 cleanup 보장
  useEffect(() => initZoomBridge(), []);

  // CR10-4: 에러 상태 / LargeFileWarning 대기 상태
  const [fileError, setFileError] = useState<FileErrorState | null>(null);
  const [pendingLargeFile, setPendingLargeFile] = useState<PendingLargeFile | null>(null);

  // 사이클 14: 업데이트 알림
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => window.api.onUpdateAvailable((v) => setUpdateVersion(v)), []);

  // CR8-2: document가 바뀔 때만 parseMarkdown 재실행
  const rendererDocument = useMemo(
    () => (document ? parseMarkdown(document.rawText, document.path) : null),
    [document],
  );

  const mainNodeRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const mainCallbackRef = useCallback((node: HTMLElement | null) => {
    mainNodeRef.current = node;
    articleRef.current = node ? node.querySelector('article') : null;
  }, []);

  const { activeAnchor, suspendScrollSpy } = useScrollSpy(
    rendererDocument?.headings ?? [],
    articleRef,
  );

  const rendererJumpRef = useRef<((anchor: string) => void) | undefined>(undefined);

  /** openFlow 결과 처리 — error/too-large 분기 */
  const handleOpenOutcome = useCallback(async (filePath: string): Promise<void> => {
    const outcome = await openFilePath(filePath);
    if (outcome.kind === 'ok') {
      setFileError(null);
    } else if (outcome.kind === 'too-large') {
      setPendingLargeFile({ filePath: outcome.filePath, sizeMb: outcome.sizeMb });
    } else if (outcome.kind === 'error') {
      setFileError({ kind: outcome.errorKind, pathHint: outcome.pathHint, retryPath: outcome.pathHint });
    }
  }, [openFilePath]);

  /** ⌘O 다이얼로그 열기 */
  const handleOpenDialog = useCallback(async (): Promise<void> => {
    const outcome = await openFileViaDialog();
    if (outcome.kind === 'error') {
      setFileError({ kind: outcome.errorKind, pathHint: outcome.pathHint, retryPath: undefined });
    } else if (outcome.kind === 'ok') {
      setFileError(null);
    }
  }, [openFileViaDialog]);

  // main 메뉴 ⌘O → main이 api:documentOpened IPC를 push하면 여기서 처리
  useEffect(() => {
    const cleanup = window.api.onDocumentOpened((filePath: string) => {
      void handleOpenOutcome(filePath);
    });
    return cleanup;
  }, [handleOpenOutcome]);

  // main 메뉴 ⌘1/⌘2/⌘3 → IPC push → renderer에서 수신
  useEffect(() => {
    const cleanupToggle = window.api.onToggleSidebar(() => { toggle(); });
    const cleanupFocus = window.api.onFocusArticle(() => { mainNodeRef.current?.focus(); });
    const cleanupWide = window.api.onToggleWide(() => { toggleWide(); });
    return () => {
      cleanupToggle();
      cleanupFocus();
      cleanupWide();
    };
  }, [toggle, toggleWide]);

  // 사이클 16: 탭 IPC listener — onTabClose / onTabNext / onTabPrev
  useEffect(() => {
    const cleanupClose = window.api.onTabClose(() => {
      const { activeId: currentActiveId, closeTab, tabs: currentTabs } = tabStore.getState();
      if (currentActiveId !== null) {
        closeTab(currentActiveId);
        // 마지막 탭 닫힌 후 tabs가 empty → window close 위임 (D3)
        if (currentTabs.length <= 1) {
          void window.api.closeWindow();
        }
      } else {
        // WelcomeScreen 상태(탭 없음)에서 ⌘W → 바로 window close (D3)
        void window.api.closeWindow();
      }
    });

    const cleanupNext = window.api.onTabNext(() => {
      const { tabs: currentTabs, activeId: currentActiveId, activateTab } = tabStore.getState();
      if (currentTabs.length === 0) return;
      const idx = currentTabs.findIndex((t) => t.id === currentActiveId);
      const nextIdx = (idx + 1) % currentTabs.length;
      const nextTab = currentTabs[nextIdx];
      if (nextTab) activateTab(nextTab.id);
    });

    const cleanupPrev = window.api.onTabPrev(() => {
      const { tabs: currentTabs, activeId: currentActiveId, activateTab } = tabStore.getState();
      if (currentTabs.length === 0) return;
      const idx = currentTabs.findIndex((t) => t.id === currentActiveId);
      const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length;
      const prevTab = currentTabs[prevIdx];
      if (prevTab) activateTab(prevTab.id);
    });

    return () => {
      cleanupClose();
      cleanupNext();
      cleanupPrev();
    };
  }, [tabStore]);

  // P16-6: 키보드 단축키 — ⌘O keydown도 openFlow 경유 (menu IPC와 단일 진실원 일관)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!event.metaKey) return;

      if (event.key === 'o') {
        event.preventDefault();
        void handleOpenDialog();
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
  }, [handleOpenDialog, toggle, toggleWide]);

  function handleFileDrop(doc: DocumentData): void {
    setFileError(null);
    const tabId = tabStore.getState().focusOrAddByPath(doc.path);
    tabStore.getState().setTabDocument(tabId, doc);
  }

  function handleFileDropError(kind: FileErrorKind, pathHint?: string): void {
    setFileError({ kind, pathHint, retryPath: pathHint });
  }

  function handleJump(anchor: string): void {
    suspendScrollSpy(anchor);
    rendererJumpRef.current?.(anchor);
  }

  async function handleLargeFileContinue(): Promise<void> {
    if (!pendingLargeFile) return;
    const { filePath } = pendingLargeFile;
    setPendingLargeFile(null);
    const result = await window.api.openFilePath(filePath);
    if (result.ok) {
      setFileError(null);
      const tabId = tabStore.getState().focusOrAddByPath(filePath);
      tabStore.getState().setTabDocument(tabId, result.document);
    } else {
      setFileError({
        kind: result.code === 'EACCES' ? 'permission' : 'io',
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
      void handleOpenOutcome(retryPath);
    }
  }

  function handleErrorCancel(): void {
    setFileError(null);
  }

  // 탭 닫기 — UI(닫기 버튼 클릭)에서 직접 처리
  function handleCloseTab(id: string): void {
    const { closeTab, tabs: currentTabs } = tabStore.getState();
    closeTab(id);
    if (currentTabs.length <= 1) {
      void window.api.closeWindow();
    }
  }

  function handleActivateTab(id: string): void {
    tabStore.getState().activateTab(id);
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
      {/* 탭 바 — TitleBar 아래 fixed 행 (P16-3). 항상 렌더해야 .md-layout margin-top 기준 일관 */}
      <TabBar onCloseTab={handleCloseTab} onActivateTab={handleActivateTab} />
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
              onOpenFile={() => { void handleOpenDialog(); }}
              onOpenRecent={(path) => { void handleOpenOutcome(path); }}
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
      <TabProvider>
        <DocumentProvider>
          <AppInner />
        </DocumentProvider>
      </TabProvider>
    </ThemeProvider>
  );
}

export default App;
