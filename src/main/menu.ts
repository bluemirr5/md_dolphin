// menu.ts — macOS Application Menu
// 사이클 9: 6 메뉴 구성 (App/File/Edit/View/Window/Help)
// File: Open(⌘O)·Print(⌘P)·Save as PDF(⇧⌘P)·Close(⌘W)
// View: Zoom In(⌘+)·Zoom Out(⌘-)·Actual Size(⌘0)·Toggle Sidebar(⌘1)·Focus Article(⌘2)
// Window/Edit/Help: 표준 role
// ⌘1/⌘2: menu accelerator → IPC push (사이클 8 keydown handler와 동일 채널 사용 — 충돌 없음)
import { app, Menu, BrowserWindow } from 'electron';
import { API_DOCUMENT_OPENED, API_VIEW_TOGGLE_SIDEBAR, API_VIEW_FOCUS_ARTICLE } from '@shared/ipc-channels';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import { applyZoom } from './zoom-ipc';
import { printPage, printToPdf } from './print-ipc';
import { dirname } from 'node:path';

/**
 * Application Menu를 설치한다.
 * macOS 분기는 App 메뉴 등록부에서만 process.platform === 'darwin' 직참조 1회 허용.
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
  const template: Electron.MenuItemConstructorOptions[] = [];

  // macOS App 메뉴 — process.platform === 'darwin' 직참조 1회 허용 (Electron 표준)
  if (process.platform === 'darwin') {
    template.push({
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
    });
  }

  // File 메뉴
  template.push({
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
              windowManager.setBaseDir(win, dirname(result.document.path));
              win.webContents.send(API_DOCUMENT_OPENED, result.document.path);
            }
          });
        },
      },
      { type: 'separator' },
      {
        label: 'Print…',
        accelerator: 'CmdOrCtrl+P',
        click: () => {
          const win = getFocusedWindow();
          if (!win) return;
          printPage(win);
        },
      },
      {
        label: 'Save as PDF…',
        accelerator: 'Shift+CmdOrCtrl+P',
        click: () => {
          const win = getFocusedWindow();
          if (!win) return;
          void printToPdf(win);
        },
      },
      { type: 'separator' },
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      },
    ],
  });

  // Edit 메뉴
  template.push({
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
  });

  // View 메뉴 — zoom IPC + sidebar/article 토글
  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, 0.5);
        },
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, -0.5);
        },
      },
      {
        label: 'Actual Size',
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, 0);
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Sidebar',
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          const win = getFocusedWindow();
          win?.webContents.send(API_VIEW_TOGGLE_SIDEBAR);
        },
      },
      {
        label: 'Focus Article',
        accelerator: 'CmdOrCtrl+2',
        click: () => {
          const win = getFocusedWindow();
          win?.webContents.send(API_VIEW_FOCUS_ARTICLE);
        },
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  });

  // Window 메뉴 — 표준 role (macOS 일관성)
  template.push({
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'close' },
      { type: 'separator' },
      { role: 'front' },
    ],
  });

  // Help 메뉴
  template.push({
    role: 'help',
    submenu: [],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
