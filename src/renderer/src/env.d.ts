/// <reference types="vite/client" />

// window.api 타입 선언 — preload contextBridge로 노출된 API
// OpenedFileResult 타입을 직접 인라인으로 선언하여 main 의존성 제거
// 사이클 12: ThemePack 타입 인라인 선언 + 신규 IPC 추가
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

// 사이클 12: 테마 팩 토큰 타입 인라인 선언 (shared/theme-spec.ts import 없이)
interface ThemeTokensEnvDecl {
  readonly 'color.bg': string;
  readonly 'color.text': string;
  readonly 'color.text.muted': string;
  readonly 'color.code.bg': string;
  readonly 'color.quote.bar': string;
  readonly 'color.heading.h1': string;
  readonly 'color.heading.h2': string;
  readonly 'color.heading.h3': string;
  readonly 'color.heading.h4': string;
  readonly 'color.link': string;
  readonly 'color.link.external': string;
  readonly 'color.link.tooltip.bg': string;
  readonly 'color.link.tooltip.text': string;
  readonly 'color.table.border': string;
  readonly 'color.table.header.bg': string;
  readonly 'color.table.row.alt.bg': string;
  readonly 'color.image.fallback.border': string;
  readonly 'color.image.caption.text': string;
  readonly 'color.sidebar.bg': string;
  readonly 'color.sidebar.border': string;
  readonly 'color.sidebar.link.active': string;
}

interface ThemePackEnvDecl {
  readonly id: string;
  readonly name: string;
  readonly source: 'builtin' | 'user';
  readonly light: ThemeTokensEnvDecl;
  readonly dark: ThemeTokensEnvDecl;
  readonly shiki: { readonly light: string; readonly dark: string };
}

interface ThemeUpdatePayload {
  readonly theme: RenderingTheme;
  readonly source: 'native' | 'manual';
}

interface Window {
  readonly api: {
    readonly openFile: () => Promise<OpenedFileResult | null>;
    readonly readFile: (filePath: string, baseDir: string | undefined) => Promise<OpenedFileResult>;
    readonly openFilePath: (filePath: string) => Promise<OpenedFileResult>;
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
    /** main → renderer: 와이드 모드 토글 이벤트 구독 */
    readonly onToggleWide: (callback: () => void) => () => void;
    // 사이클 10 신규 IPC
    /** 파일 stat 사전 확인 — 10MB 초과 여부 (LargeFileWarning 모달용) */
    readonly fileStat: (filePath: string) => Promise<{ size: number; tooLarge: boolean }>;
    /** 시스템 locale 조회 — app.getLocale() 결과 */
    readonly getLocale: () => Promise<string>;
    /** main → renderer: 줌 레벨 변경 이벤트 구독 */
    readonly onZoomChanged: (callback: (zoomLevel: number) => void) => () => void;
    // 사이클 12 신규 IPC
    /** 빌트인 + 사용자 테마 팩 목록 조회 */
    readonly themePackList: () => Promise<ThemePackEnvDecl[]>;
    /** id로 테마 팩 조회 — 없으면 null */
    readonly themePackGet: (id: string) => Promise<ThemePackEnvDecl | null>;
    /** 테마 폴더를 Finder에서 열기 */
    readonly themePackRevealFolder: () => Promise<void>;
    /** main → renderer: 팩 목록 변경 이벤트 구독 */
    readonly onThemePackListChanged: (callback: (packs: ThemePackEnvDecl[]) => void) => () => void;
    /** main → renderer: 활성 테마 팩 변경 요청 이벤트 구독 */
    readonly onThemePackSetActive: (callback: (id: string) => void) => () => void;
    // 사이클 14 신규 IPC
    /** main → renderer: 업데이트 가능 버전 push 구독 */
    readonly onUpdateAvailable: (callback: (version: string) => void) => () => void;
    /** GitHub Releases 페이지를 브라우저로 열기 */
    readonly openReleases: () => Promise<void>;
    // 사이클 16 신규 IPC
    /** main → renderer: 탭 닫기 요청 이벤트 구독 (⌘W 가로채기, D3) */
    readonly onTabClose: (callback: () => void) => () => void;
    /** main → renderer: 다음 탭 전환 이벤트 구독 */
    readonly onTabNext: (callback: () => void) => () => void;
    /** main → renderer: 이전 탭 전환 이벤트 구독 */
    readonly onTabPrev: (callback: () => void) => () => void;
    /** 윈도우 닫기 — 마지막 탭 close 시 renderer가 main에 위임 (D3) */
    readonly closeWindow: () => Promise<void>;
  };
}
