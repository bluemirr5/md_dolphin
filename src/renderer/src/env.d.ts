/// <reference types="vite/client" />

// window.api 타입 선언 — preload contextBridge로 노출된 API
// OpenedFileResult 타입을 직접 인라인으로 선언하여 main 의존성 제거
interface OpenedFileSuccess {
  readonly ok: true;
  readonly document: {
    readonly path: string;
    readonly rawText: string;
    readonly baseDir: string | undefined;
  };
}

interface OpenedFileError {
  readonly ok: false;
  readonly code: 'OUTSIDE_BASE_DIR' | 'ENOENT' | 'EACCES' | 'DECODE_FAIL';
  readonly message: string;
}

type OpenedFileResult = OpenedFileSuccess | OpenedFileError;

// 테마 타입 — preload 의존 제거를 위해 인라인 선언
type RenderingTheme = 'light' | 'dark';

interface ThemeUpdatePayload {
  readonly theme: RenderingTheme;
  readonly source: 'native' | 'manual';
}

interface Window {
  readonly api: {
    readonly openFile: () => Promise<OpenedFileResult | null>;
    readonly readFile: (filePath: string, baseDir: string | undefined) => Promise<OpenedFileResult>;
    readonly openExternal: (url: string) => Promise<void>;
    readonly getDroppedFilePath: (file: File) => string;
    readonly onDocumentOpened: (callback: (filePath: string) => void) => () => void;
    readonly getTheme: () => Promise<RenderingTheme>;
    readonly watchTheme: (callback: (payload: ThemeUpdatePayload) => void) => () => void;
    /** 현재 BrowserWindow의 id — mddolphin-asset:// 프로토콜 baseDir 조회에 사용 (P7-10) */
    readonly windowId: number;
    // 사이클 9 신규 IPC
    readonly zoomIn: () => Promise<void>;
    readonly zoomOut: () => Promise<void>;
    readonly zoomReset: () => Promise<void>;
    readonly print: () => Promise<void>;
    readonly savePdf: () => Promise<void>;
    /** main → renderer: 사이드바 토글 이벤트 구독 */
    readonly onToggleSidebar: (callback: () => void) => () => void;
    /** main → renderer: 문서 영역 포커스 이벤트 구독 */
    readonly onFocusArticle: (callback: () => void) => () => void;
  };
}
