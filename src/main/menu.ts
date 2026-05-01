// menu.ts — macOS Application Menu
// 사이클 9: 6 메뉴 구성 (App/File/Edit/View/Window/Help)
// 사이클 10: 라벨 하드코딩 → i18n-lookup helper로 치환 (P10-1)
//   - main에는 i18next 풀 인스턴스 미생성, lookup helper 사용
//   - macOS 분기는 src/shared/platform.ts 경유 유지
// File: Open(⌘O)·Print(⌘P)·Save as PDF(⇧⌘P)·Close(⌘W)
// View: Zoom In(⌘+)·Zoom Out(⌘-)·Actual Size(⌘0)·Toggle Sidebar(⌘1)·Focus Article(⌘2)
// Window/Edit/Help: 표준 role
// ⌘1/⌘2: menu accelerator → IPC push (사이클 8 keydown handler와 동일 채널 사용 — 충돌 없음)
// 사이클 11a (CR10-7): ZOOM_STEP → @shared/zoom 단일 진실원으로 통일
import { app, Menu, BrowserWindow } from 'electron';
import { API_DOCUMENT_OPENED, API_VIEW_TOGGLE_SIDEBAR, API_VIEW_FOCUS_ARTICLE } from '@shared/ipc-channels';
import { lookup, normalizeMainLocale } from '@shared/i18n-lookup';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import { applyZoom } from './zoom-ipc';
import { printPage, printToPdf } from './print-ipc';
import { dirname } from 'node:path';
import { ZOOM_STEP } from '@shared/zoom';

/**
 * Application Menu를 설치한다.
 * macOS 분기는 App 메뉴 등록부에서만 process.platform === 'darwin' 직참조 1회 허용.
 * 메뉴 라벨은 i18n-lookup helper로 locale에 맞게 치환한다.
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
  // app.getLocale()을 ko/en으로 정규화
  const locale = normalizeMainLocale(app.getLocale());
  const t = (key: string) => lookup(locale, key);

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
    label: t('menu.file.label'),
    submenu: [
      {
        label: t('menu.file.open'),
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
        label: t('menu.file.print'),
        accelerator: 'CmdOrCtrl+P',
        click: () => {
          const win = getFocusedWindow();
          if (!win) return;
          printPage(win);
        },
      },
      {
        label: t('menu.file.saveAsPdf'),
        accelerator: 'Shift+CmdOrCtrl+P',
        click: () => {
          const win = getFocusedWindow();
          if (!win) return;
          void printToPdf(win);
        },
      },
      { type: 'separator' },
      {
        label: t('menu.file.close'),
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      },
    ],
  });

  // Edit 메뉴
  template.push({
    label: t('menu.edit.label'),
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
    label: t('menu.view.label'),
    submenu: [
      {
        label: t('menu.view.zoomIn'),
        accelerator: 'CmdOrCtrl+Plus',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, ZOOM_STEP);
        },
      },
      {
        label: t('menu.view.zoomOut'),
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, -ZOOM_STEP);
        },
      },
      {
        label: t('menu.view.actualSize'),
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          const win = getFocusedWindow();
          if (win) applyZoom(win.webContents, 0);
        },
      },
      { type: 'separator' },
      {
        label: t('menu.view.toggleSidebar'),
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          const win = getFocusedWindow();
          win?.webContents.send(API_VIEW_TOGGLE_SIDEBAR);
        },
      },
      {
        label: t('menu.view.focusArticle'),
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
    label: t('menu.window.label'),
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
