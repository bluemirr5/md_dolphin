// preload — contextBridge로 renderer에 좁은 IPC 표면을 노출한다.
// 설계 제약: openFile, readFile, openExternal, getDroppedFilePath, onDocumentOpened, getTheme, watchTheme 7개 기존 노출
// 사이클 9 신규: zoomIn/zoomOut/zoomReset, print, savePdf, benchColdStart(dev only) 추가
// drop 파일 경로: webUtils.getPathForFile 사용 — sandbox=true 환경에서 File.path 제거됨 (Electron 32+)
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  API_OPEN_FILE,
  API_READ_FILE,
  API_OPEN_FILE_PATH,
  API_OPEN_EXTERNAL,
  API_DOCUMENT_OPENED,
  API_GET_THEME,
  API_THEME_UPDATED,
  API_GET_WINDOW_ID,
  API_BENCH_COLD_START,
  API_VIEW_ZOOM_IN,
  API_VIEW_ZOOM_OUT,
  API_VIEW_ZOOM_RESET,
  API_VIEW_PRINT,
  API_VIEW_SAVE_PDF,
  API_VIEW_TOGGLE_SIDEBAR,
  API_VIEW_FOCUS_ARTICLE,
  API_FILE_STAT,
  API_GET_LOCALE,
  API_VIEW_ZOOM_CHANGED,
  API_VIEW_TOGGLE_WIDE,
  API_THEME_PACK_LIST,
  API_THEME_PACK_GET,
  API_THEME_PACK_REVEAL_FOLDER,
  API_THEME_PACK_LIST_CHANGED,
  API_THEME_PACK_SET_ACTIVE,
  API_UPDATE_AVAILABLE,
  API_UPDATE_OPEN_RELEASES,
  API_VIEW_TAB_CLOSE,
  API_VIEW_TAB_NEXT,
  API_VIEW_TAB_PREV,
  API_WINDOW_CLOSE,
} from '@shared/ipc-channels';
import type { OpenedFileResult, StatResult } from '../main/file-service';
import type { RenderingTheme, ThemeUpdatePayload } from '@shared/theme-types';
import type { ThemePack } from '@shared/theme-spec';

const api = {
  /**
   * 파일 열기 다이얼로그를 열고 선택한 파일을 읽는다.
   * 취소 시 null 반환.
   */
  openFile: (): Promise<OpenedFileResult | null> =>
    ipcRenderer.invoke(API_OPEN_FILE) as Promise<OpenedFileResult | null>,

  /**
   * 지정한 경로의 파일을 읽는다. baseDir 지정 시 path-guard 검증.
   */
  readFile: (filePath: string, baseDir: string | undefined): Promise<OpenedFileResult> =>
    ipcRenderer.invoke(API_READ_FILE, filePath, baseDir) as Promise<OpenedFileResult>,

  /**
   * 사용자가 명시 선택한 경로를 연다 (Finder, 최근 파일 등).
   * baseDir 검증 없이 읽고, 성공 시 main이 baseDir를 새 파일 디렉터리로 갱신.
   */
  openFilePath: (filePath: string): Promise<OpenedFileResult> =>
    ipcRenderer.invoke(API_OPEN_FILE_PATH, filePath) as Promise<OpenedFileResult>,

  /**
   * 외부 URL을 시스템 기본 브라우저로 연다.
   */
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(API_OPEN_EXTERNAL, url) as Promise<void>,

  /**
   * drag&drop된 File 객체에서 파일 시스템 경로를 얻는다.
   * renderer에서 File.path 직접 접근 금지 — webUtils.getPathForFile 사용 (설계 제약)
   */
  getDroppedFilePath: (file: File): string => webUtils.getPathForFile(file),

  /**
   * main → renderer: 파일 열기 이벤트 수신 리스너를 등록한다.
   * open-file-handler flush 시 API_DOCUMENT_OPENED 채널로 수신.
   */
  onDocumentOpened: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on(API_DOCUMENT_OPENED, handler);
    // 정리 함수 반환 — React useEffect cleanup에서 사용
    return () => {
      ipcRenderer.removeListener(API_DOCUMENT_OPENED, handler);
    };
  },

  /**
   * 현재 시스템 테마(resolved)를 조회한다.
   * nativeTheme.shouldUseDarkColors 기반 — 항상 'light' | 'dark' 반환.
   */
  getTheme: (): Promise<RenderingTheme> =>
    ipcRenderer.invoke(API_GET_THEME) as Promise<RenderingTheme>,

  /**
   * 시스템 테마 변경 이벤트를 구독한다.
   * 반환된 dispose 함수를 호출하면 구독이 해제된다 (ThemeProvider unmount 시 사용).
   * Strict Mode 안전: mount→dispose→remount 시 리스너 1개만 생존.
   */
  watchTheme: (callback: (payload: ThemeUpdatePayload) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ThemeUpdatePayload) =>
      callback(payload);
    ipcRenderer.on(API_THEME_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(API_THEME_UPDATED, handler);
    };
  },

  /**
   * 현재 BrowserWindow의 id를 반환한다.
   * mddolphin-asset:// 프로토콜 핸들러가 windowId로 baseDir를 조회할 때 사용 (P7-10).
   * sendSync — preload 초기화 시점에 main process에서 동기 조회 (sandbox 친화적).
   */
  windowId: ipcRenderer.sendSync(API_GET_WINDOW_ID) as number,

  // ── 사이클 9 신규 IPC ────────────────────────────────────────────────────────

  /** 줌 인 */
  zoomIn: (): Promise<void> => ipcRenderer.invoke(API_VIEW_ZOOM_IN) as Promise<void>,

  /** 줌 아웃 */
  zoomOut: (): Promise<void> => ipcRenderer.invoke(API_VIEW_ZOOM_OUT) as Promise<void>,

  /** 줌 리셋 (Actual Size) */
  zoomReset: (): Promise<void> => ipcRenderer.invoke(API_VIEW_ZOOM_RESET) as Promise<void>,

  /** 시스템 인쇄 다이얼로그 표시 */
  print: (): Promise<void> => ipcRenderer.invoke(API_VIEW_PRINT) as Promise<void>,

  /** PDF 저장 다이얼로그 표시 → 파일 저장 */
  savePdf: (): Promise<void> => ipcRenderer.invoke(API_VIEW_SAVE_PDF) as Promise<void>,

  /** main → renderer: 사이드바 토글 이벤트 구독 */
  onToggleSidebar: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_TOGGLE_SIDEBAR, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_TOGGLE_SIDEBAR, handler); };
  },

  /** main → renderer: 문서 영역 포커스 이벤트 구독 */
  onFocusArticle: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_FOCUS_ARTICLE, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_FOCUS_ARTICLE, handler); };
  },

  /** main → renderer: 와이드 모드 토글 이벤트 구독 */
  onToggleWide: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_TOGGLE_WIDE, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_TOGGLE_WIDE, handler); };
  },

  // ── 사이클 10 신규 IPC ────────────────────────────────────────────────────────

  /**
   * 파일 stat 사전 확인 — 10MB 초과 여부를 renderer가 모달로 확인하기 전에 호출.
   * file:stat IPC 화이트리스트 추가 (설계 제약 P10-8).
   */
  fileStat: (filePath: string): Promise<StatResult> =>
    ipcRenderer.invoke(API_FILE_STAT, filePath) as Promise<StatResult>,

  /**
   * 시스템 locale 조회 — app.getLocale() 결과를 renderer에 노출.
   * i18n 초기화 시 사용.
   */
  getLocale: (): Promise<string> =>
    ipcRenderer.invoke(API_GET_LOCALE) as Promise<string>,

  /**
   * main → renderer: 줌 레벨 변경 이벤트 구독.
   * zoom-bridge.ts가 --font-scale CSS 변수 갱신에 사용.
   */
  onZoomChanged: (callback: (zoomLevel: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, zoomLevel: number) => callback(zoomLevel);
    ipcRenderer.on(API_VIEW_ZOOM_CHANGED, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_ZOOM_CHANGED, handler); };
  },

  // ── 사이클 12 신규 IPC ────────────────────────────────────────────────────────

  /**
   * 빌트인 + 사용자 테마 팩 목록 조회.
   */
  themePackList: (): Promise<ThemePack[]> =>
    ipcRenderer.invoke(API_THEME_PACK_LIST) as Promise<ThemePack[]>,

  /**
   * id로 테마 팩 조회. 없으면 null.
   */
  themePackGet: (id: string): Promise<ThemePack | null> =>
    ipcRenderer.invoke(API_THEME_PACK_GET, id) as Promise<ThemePack | null>,

  /**
   * 테마 폴더를 Finder에서 열기.
   */
  themePackRevealFolder: (): Promise<void> =>
    ipcRenderer.invoke(API_THEME_PACK_REVEAL_FOLDER) as Promise<void>,

  /**
   * main → renderer: 팩 목록 변경 이벤트 구독.
   */
  onThemePackListChanged: (callback: (packs: ThemePack[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, packs: ThemePack[]) => callback(packs);
    ipcRenderer.on(API_THEME_PACK_LIST_CHANGED, handler);
    return () => { ipcRenderer.removeListener(API_THEME_PACK_LIST_CHANGED, handler); };
  },

  /**
   * main → renderer: 활성 테마 팩 변경 요청 이벤트 구독 (View > Theme 메뉴 클릭 시).
   */
  onThemePackSetActive: (callback: (id: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on(API_THEME_PACK_SET_ACTIVE, handler);
    return () => { ipcRenderer.removeListener(API_THEME_PACK_SET_ACTIVE, handler); };
  },

  // ── 사이클 14 신규 IPC ────────────────────────────────────────────────────────

  /** main → renderer: 업데이트 가능 버전 push 구독 */
  onUpdateAvailable: (callback: (version: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string) => callback(version);
    ipcRenderer.on(API_UPDATE_AVAILABLE, handler);
    return () => { ipcRenderer.removeListener(API_UPDATE_AVAILABLE, handler); };
  },

  /** GitHub Releases 페이지를 브라우저로 열기 */
  openReleases: (): Promise<void> =>
    ipcRenderer.invoke(API_UPDATE_OPEN_RELEASES) as Promise<void>,

  // ── 사이클 16 신규 IPC ────────────────────────────────────────────────────────

  /** main → renderer: 탭 닫기 요청 이벤트 구독 (⌘W 가로채기, D3) */
  onTabClose: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_TAB_CLOSE, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_TAB_CLOSE, handler); };
  },

  /** main → renderer: 다음 탭 전환 이벤트 구독 (⌥⌘→ / ⇧⌘]) */
  onTabNext: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_TAB_NEXT, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_TAB_NEXT, handler); };
  },

  /** main → renderer: 이전 탭 전환 이벤트 구독 (⌥⌘← / ⇧⌘[) */
  onTabPrev: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(API_VIEW_TAB_PREV, handler);
    return () => { ipcRenderer.removeListener(API_VIEW_TAB_PREV, handler); };
  },

  /** 윈도우 닫기 — 마지막 탭 close 시 renderer가 main에 위임 (D3) */
  closeWindow: (): Promise<void> =>
    ipcRenderer.invoke(API_WINDOW_CLOSE) as Promise<void>,

  // bench:cold-start — dev only (process.env.NODE_ENV !== 'production')
  // AC12: production 빌드에서는 미노출
  ...(process.env['NODE_ENV'] !== 'production' ? {
    benchColdStart: (): Promise<{ appStart: number; appReady: number | null; elapsed: number | null }> =>
      ipcRenderer.invoke(API_BENCH_COLD_START) as Promise<{ appStart: number; appReady: number | null; elapsed: number | null }>,
  } : {}),
} as const;

try {
  contextBridge.exposeInMainWorld('api', api);
} catch (error) {
  console.error('[preload] contextBridge 노출 실패:', error);
}

export type Api = typeof api;
