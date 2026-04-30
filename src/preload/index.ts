// preload — contextBridge로 renderer에 좁은 IPC 표면을 노출한다.
// 설계 제약: openFile, readFile, openExternal, getDroppedFilePath 4개만 노출
// drop 파일 경로: webUtils.getPathForFile 사용 — sandbox=true 환경에서 File.path 제거됨 (Electron 32+)
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  API_OPEN_FILE,
  API_READ_FILE,
  API_OPEN_EXTERNAL,
  API_DOCUMENT_OPENED,
} from '@shared/ipc-channels';
import type { OpenedFileResult } from '../main/file-service';

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
} as const;

try {
  contextBridge.exposeInMainWorld('api', api);
} catch (error) {
  console.error('[preload] contextBridge 노출 실패:', error);
}

export type Api = typeof api;
