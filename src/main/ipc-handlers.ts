// IPC 핸들러 등록 — ipcMain.handle 으로 renderer 요청을 처리한다.
// 모든 throw는 OpenedFileError 형태로 정규화하여 renderer에 반환 (설계 제약)
import { ipcMain, shell, BrowserWindow, app } from 'electron';
import {
  API_OPEN_FILE,
  API_READ_FILE,
  API_OPEN_EXTERNAL,
  API_GET_THEME,
  API_THEME_UPDATED,
  API_GET_WINDOW_ID,
  API_FILE_STAT,
  API_GET_LOCALE,
} from '@shared/ipc-channels';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import { assertWithinBaseDir } from './path-guard';
import { dirname } from 'node:path';
import { getCurrentTheme, watchTheme } from './theme-service';
import type { ThemeUpdatePayload } from '@shared/theme-types';
import { SAFE_EXTERNAL_PROTOCOLS } from './security';

/** shell.openExternal의 최소 인터페이스 — 테스트 DI용 */
export interface ShellLike {
  openExternal(url: string): Promise<void>;
}

/**
 * api:openExternal 핸들러 본문 — 순수 함수로 분리하여 테스트 가능 (P7-1, 마스터 플랜 4.4)
 *
 * 검증 순서:
 * 1. URL 파싱 가능 여부 (잘못된 URL → reject + warn)
 * 2. SAFE_EXTERNAL_PROTOCOLS 화이트리스트 (http/https/mailto 외 → reject + warn)
 * 3. 통과 시 shell.openExternal 호출
 */
export async function handleOpenExternal(
  url: string,
  deps: { shell: ShellLike } = { shell },
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn('[api:openExternal] 잘못된 URL:', url);
    throw new Error(`invalid URL: ${url}`);
  }

  if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
    console.warn('[api:openExternal] 비허용 protocol 거부:', parsed.protocol, url);
    throw new Error(`protocol not allowed: ${parsed.protocol}`);
  }

  await deps.shell.openExternal(url);
}

/**
 * IPC 핸들러를 등록한다.
 *
 * @param fileService   파일 읽기/다이얼로그 서비스
 * @param windowManager 윈도우별 baseDir 관리
 * @returns dispose — nativeTheme 리스너 해제 함수 (app quit 시 호출)
 */
export function registerIpcHandlers(
  fileService: FileService,
  windowManager: DocumentWindowManager,
): () => void {
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
  // P7-1: silent ignore → 명시 reject + console.warn (비허용 protocol 시)
  ipcMain.handle(API_OPEN_EXTERNAL, (_event, url: string) =>
    handleOpenExternal(url),
  );

  // api:getTheme — 현재 resolved 테마 반환 (invoke)
  ipcMain.handle(API_GET_THEME, () => getCurrentTheme());

  // file:stat — 파일 크기 사전 확인 (10MB 모달용)
  // CR10-3: baseDir 지정된 윈도우에서는 path-guard 검증 수행 (traversal 보안 우회 차단)
  ipcMain.handle(API_FILE_STAT, async (event, filePath: string) => {
    const win = findWindowByWebContents(event.sender);
    const baseDir = win ? windowManager.get(win)?.baseDir : undefined;
    if (baseDir !== undefined) {
      await assertWithinBaseDir(filePath, baseDir);
    }
    return fileService.statFile(filePath);
  });

  // api:getLocale — 시스템 locale 반환 (i18n 초기화용)
  ipcMain.handle(API_GET_LOCALE, () => app.getLocale());

  // api:getWindowId — preload에서 sendSync로 호출, BrowserWindow.id를 동기 반환 (P7-10)
  // ipcMain.handle(async)이 아닌 ipcMain.on + event.returnValue를 사용해야 sendSync 응답 가능
  ipcMain.on(API_GET_WINDOW_ID, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    event.returnValue = win?.id ?? -1;
  });

  // nativeTheme.updated → 모든 BrowserWindow에 broadcast (app 수명 단일 등록)
  const disposeThemeWatch = watchTheme((payload: ThemeUpdatePayload) => {
    broadcastThemeUpdate(payload);
  });

  return () => {
    disposeThemeWatch();
    ipcMain.removeHandler(API_OPEN_FILE);
    ipcMain.removeHandler(API_READ_FILE);
    ipcMain.removeHandler(API_OPEN_EXTERNAL);
    ipcMain.removeHandler(API_GET_THEME);
    ipcMain.removeAllListeners(API_GET_WINDOW_ID);
    ipcMain.removeHandler(API_FILE_STAT);
    ipcMain.removeHandler(API_GET_LOCALE);
  };
}

/**
 * 살아있는 모든 BrowserWindow의 renderer에 테마 업데이트를 broadcast한다.
 * destroyed 윈도우는 건너뜀 (P4-2: 예외 방지).
 */
function broadcastThemeUpdate(payload: ThemeUpdatePayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
    win.webContents.send(API_THEME_UPDATED, payload);
  }
}

/**
 * WebContents 발신자에서 BrowserWindow를 찾는다.
 */
function findWindowByWebContents(
  sender: Electron.WebContents,
): Electron.BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}
