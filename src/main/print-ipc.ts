// print-ipc.ts — 인쇄/PDF 저장 IPC 핸들러
// AC6: ⌘P → 시스템 프린트 다이얼로그, ⇧⌘P → 저장 다이얼로그 → PDF 파일 생성
// PDF 저장 경로는 path-guard 통과 필수 (외부 sandbox 쓰기 차단)
// 보안: webContents.print({ silent: false }) — 사용자 확인 다이얼로그 필수
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { assertWithinBaseDir } from './path-guard';
import {
  API_VIEW_PRINT,
  API_VIEW_SAVE_PDF,
} from '@shared/ipc-channels';

/**
 * 시스템 프린트 다이얼로그를 연다.
 * menu.ts의 메뉴 클릭 핸들러가 ipcMain.handle 우회 없이 직접 호출.
 * silent: false — 사용자 확인 다이얼로그 필수 (보안 제약)
 */
export function printPage(win: BrowserWindow): void {
  win.webContents.print({ silent: false });
}

/**
 * PDF 저장 다이얼로그를 열고 파일로 기록한다.
 * menu.ts의 메뉴 클릭 핸들러가 ipcMain.handle 우회 없이 직접 호출.
 */
export async function printToPdf(win: BrowserWindow): Promise<void> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'PDF로 저장',
    defaultPath: 'document.pdf',
    filters: [{ name: 'PDF 파일', extensions: ['pdf'] }],
  });

  if (canceled || filePath === undefined) return;

  // path-guard 검증 — 사용자 홈 디렉터리 내부 쓰기만 허용
  // /etc, /tmp 등 시스템 경로에는 저장 불가
  try {
    await assertWithinBaseDir(filePath, homedir());
  } catch {
    // 경로 검증 실패 — 사용자에게 명시적으로 알림
    console.error('[print-ipc] PDF 저장 거부: 홈 디렉터리 외부 경로:', filePath);
    dialog.showErrorBox('PDF 저장 실패', '허용되지 않는 경로입니다. 홈 디렉터리 내부에 저장해 주세요.');
    return;
  }

  try {
    // PDF 옵션은 기본값 — 커스텀 옵션은 사이클 10
    const pdfData = await win.webContents.printToPDF({});
    await fs.writeFile(filePath, pdfData);
  } catch (err: unknown) {
    console.error('[print-ipc] PDF 저장 실패:', err);
    await dialog.showMessageBox(win, {
      type: 'error',
      message: 'PDF 저장 중 오류가 발생했습니다.',
    });
  }
}

export function registerPrintIpc(): () => void {
  const handlePrint = (_event: Electron.IpcMainInvokeEvent): void => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (!win) return;
    printPage(win);
  };

  const handleSavePdf = async (_event: Electron.IpcMainInvokeEvent): Promise<void> => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (!win) return;
    await printToPdf(win);
  };

  ipcMain.handle(API_VIEW_PRINT, handlePrint);
  ipcMain.handle(API_VIEW_SAVE_PDF, handleSavePdf);

  return () => {
    ipcMain.removeHandler(API_VIEW_PRINT);
    ipcMain.removeHandler(API_VIEW_SAVE_PDF);
  };
}
