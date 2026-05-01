// preload — contextBridge로 renderer에 좁은 IPC 표면을 노출한다.
// 설계 제약: openFile, readFile, openExternal, getDroppedFilePath, onDocumentOpened, getTheme, watchTheme 7개 기존 노출
// 사이클 9 신규: zoomIn/zoomOut/zoomReset, print, savePdf, benchColdStart(dev only) 추가
// drop 파일 경로: webUtils.getPathForFile 사용 — sandbox=true 환경에서 File.path 제거됨 (Electron 32+)
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  API_OPEN_FILE,
  API_READ_FILE,
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
} from '@shared/ipc-channels';
import type { OpenedFileResult } from '../main/file-service';
import type { RenderingTheme, ThemeUpdatePayload } from '@shared/theme-types';

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
