// IPC 핸들러 등록 — ipcMain.handle 으로 renderer 요청을 처리한다.
// 모든 throw는 OpenedFileError 형태로 정규화하여 renderer에 반환 (설계 제약)
import { ipcMain, shell, BrowserWindow } from 'electron';
import { API_OPEN_FILE, API_READ_FILE, API_OPEN_EXTERNAL } from '@shared/ipc-channels';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import { dirname } from 'node:path';

const SAFE_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:', 'mailto:']);

/**
 * IPC 핸들러를 등록한다.
 *
 * @param fileService  파일 읽기/다이얼로그 서비스
 * @param windowManager 윈도우별 baseDir 관리
 */
export function registerIpcHandlers(
  fileService: FileService,
  windowManager: DocumentWindowManager,
): void {
  // api:openFile — 다이얼로그 열기
  ipcMain.handle(API_OPEN_FILE, async (event) => {
    try {
      const result = await fileService.openViaDialog();
      if (result?.ok) {
        // 선택한 파일의 baseDir를 윈도우에 저장 (P2-7)
        const win = findWindowByWebContents(event.sender);
        if (win) {
          windowManager.setBaseDir(win, dirname(result.document.path));
        }
      }
      return result;
    } catch (err) {
      return {
        ok: false,
        code: 'DECODE_FAIL',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // api:readFile — 파일 읽기 (baseDir 검증 포함)
  ipcMain.handle(API_READ_FILE, async (event, filePath: string, baseDir: string | undefined) => {
    try {
      const win = findWindowByWebContents(event.sender);
      // 호출자가 baseDir를 지정하지 않으면 윈도우의 현재 baseDir를 사용
      const effectiveBaseDir = baseDir ?? (win ? windowManager.get(win)?.baseDir : undefined);
      const result = await fileService.readFile(filePath, effectiveBaseDir);
      if (result.ok) {
        // 읽기 성공 시 baseDir 갱신
        if (win) {
          windowManager.setBaseDir(win, dirname(result.document.path));
        }
      }
      return result;
    } catch (err) {
      return {
        ok: false,
        code: 'DECODE_FAIL',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // api:openExternal — 외부 URL 열기 (스킴 검증)
  ipcMain.handle(API_OPEN_EXTERNAL, (_event, url: string) => {
    try {
      const parsed = new URL(url);
      if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
        void shell.openExternal(url);
      }
    } catch {
      // 잘못된 URL — 무시
    }
  });
}

/**
 * WebContents 발신자에서 BrowserWindow를 찾는다.
 */
function findWindowByWebContents(
  sender: Electron.WebContents,
): Electron.BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}
