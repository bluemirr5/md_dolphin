// menu.ts — macOS Application Menu 최소 구성
// 사이클 3: File > Open(⌘O)만 추가. 사이클 9에서 본격 구성 예정.
import { app, Menu, BrowserWindow } from 'electron';
import { API_DOCUMENT_OPENED } from '@shared/ipc-channels';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import { dirname } from 'node:path';

/**
 * Application Menu를 설치한다.
 * File > Open(⌘O) 클릭 시 FileService.openViaDialog()를 호출하고
 * 결과 파일 경로를 API_DOCUMENT_OPENED로 renderer에 push한다.
 *
 * @param fileService     파일 열기 서비스
 * @param windowManager   윈도우별 baseDir 관리
 * @param getFocusedWindow focused BrowserWindow 주입 (테스트용 override 가능)
 */
export function installMenu(
  fileService: FileService,
  windowManager: DocumentWindowManager,
  getFocusedWindow: () => BrowserWindow | null = () => BrowserWindow.getFocusedWindow(),
): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS App Menu (앱 이름)
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    // File 메뉴 — 사이클 3은 Open만
    {
      label: 'File',
      submenu: [
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const win = getFocusedWindow();
            if (!win) return;

            void fileService.openViaDialog().then((result) => {
              if (result?.ok) {
                // baseDir 갱신 후 renderer에 경로 push
                windowManager.setBaseDir(win, dirname(result.document.path));
                win.webContents.send(API_DOCUMENT_OPENED, result.document.path);
              }
            });
          },
        },
      ],
    },
    // Edit 메뉴 (기본)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // View 메뉴 (기본)
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // Window 메뉴 (기본)
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
