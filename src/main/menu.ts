// menu.ts — macOS Application Menu
// 사이클 9: 6 메뉴 구성 (App/File/Edit/View/Window/Help)
// 사이클 10: 라벨 하드코딩 → i18n-lookup helper로 치환 (P10-1)
//   - main에는 i18next 풀 인스턴스 미생성, lookup helper 사용
//   - macOS 분기는 src/shared/platform.ts 경유 유지
// File: Open(⌘O)·Print(⌘P)·Save as PDF(⇧⌘P)·Close(⌘W)
// View: Zoom In(⌘+)·Zoom Out(⌘-)·Actual Size(⌘0)·Toggle Sidebar(⌘1)·Focus Article(⌘2)·Toggle Wide(⌘3)
// Window/Edit/Help: 표준 role
// ⌘1/⌘2: menu accelerator → IPC push (사이클 8 keydown handler와 동일 채널 사용 — 충돌 없음)
// 사이클 11a (CR10-7): ZOOM_STEP → @shared/zoom 단일 진실원으로 통일
import { app, Menu, BrowserWindow } from 'electron';
import {
  API_DOCUMENT_OPENED,
  API_VIEW_TOGGLE_SIDEBAR,
  API_VIEW_FOCUS_ARTICLE,
  API_VIEW_TOGGLE_WIDE,
  API_THEME_PACK_SET_ACTIVE,
} from '@shared/ipc-channels';
import { lookup, normalizeMainLocale } from '@shared/i18n-lookup';
import type { FileService } from './file-service';
import type { DocumentWindowManager } from './document-window';
import type { ThemePackService } from './theme-pack-service';
import { applyZoom } from './zoom-ipc';
import { printPage, printToPdf } from './print-ipc';
import { dirname } from 'node:path';
import { ZOOM_STEP } from '@shared/zoom';

/**
 * Application Menu를 설치한다.
 * macOS 분기는 App 메뉴 등록부에서만 process.platform === 'darwin' 직참조 1회 허용.
 * 메뉴 라벨은 i18n-lookup helper로 locale에 맞게 치환한다.
 *
 * @param fileService      파일 열기 서비스
 * @param windowManager    윈도우별 baseDir 관리
 * @param themePackService 테마 팩 서비스 (View > Theme submenu 구성용, 사이클 12)
 * @param getActivePackId  현재 활성 팩 id getter (radio 체크 상태 결정, 사이클 12)
 * @param getFocusedWindow focused BrowserWindow 주입 (테스트용 override 가능)
 */
export async function installMenu(
  fileService: FileService,
  windowManager: DocumentWindowManager,
  themePackService?: ThemePackService,
  getActivePackId?: () => string,
  getFocusedWindow: () => BrowserWindow | null = () => BrowserWindow.getFocusedWindow(),
): Promise<void> {
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
      {
        label: t('menu.view.toggleWide'),
        accelerator: 'CmdOrCtrl+3',
        click: () => {
          const win = getFocusedWindow();
          win?.webContents.send(API_VIEW_TOGGLE_WIDE);
        },
      },
      ...(!app.isPackaged ? [
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
      ] : []),
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

  // View > Theme submenu — 사이클 12/13 (themePackService가 있을 때만 구성)
  // R2: async 전환으로 await listPacks() 후 setApplicationMenu 1회 호출 보장
  if (themePackService) {
    const packs = await themePackService.listPacks();
    const activeId = getActivePackId?.() ?? 'builtin:default';

    const viewMenuIndex = template.findIndex((item) =>
      (item as Electron.MenuItemConstructorOptions & { label?: string }).label === t('menu.view.label'),
    );

    if (viewMenuIndex !== -1) {
      const viewMenu = template[viewMenuIndex] as Electron.MenuItemConstructorOptions & { submenu: Electron.MenuItemConstructorOptions[] };

      if (Array.isArray(viewMenu.submenu)) {
        // R1: togglefullscreen 직전에 separator + Theme submenu splice 삽입
        // 인덱스 -1이면 기존 push 폴백 (menu template 구조 변경에 방어적)
        const themeSubmenu: Electron.MenuItemConstructorOptions[] = [
          ...packs.map((pack) => ({
            label: pack.name,
            type: 'radio' as const,
            checked: pack.id === activeId,
            click: () => {
              const win = getFocusedWindow();
              win?.webContents.send(API_THEME_PACK_SET_ACTIVE, pack.id);
            },
          })),
          { type: 'separator' as const },
          {
            label: t('menu.view.revealThemesFolder'),
            click: () => {
              void (async () => {
                await themePackService.revealFolder();
                await installMenu(fileService, windowManager, themePackService, getActivePackId, getFocusedWindow);
              })();
            },
          },
        ];

        const fullscreenIdx = viewMenu.submenu.findIndex((item) => item.role === 'togglefullscreen');
        if (fullscreenIdx !== -1) {
          // togglefullscreen 직전에 [themeMenu, separator] 삽입 → themeMenu와 togglefullscreen 사이에 separator 1개 보장
          viewMenu.submenu.splice(fullscreenIdx, 0, {
            label: t('menu.view.theme'),
            submenu: themeSubmenu,
          }, { type: 'separator' });
        } else {
          // 폴백: 기존 push 방식 (menu template 구조 변경에 방어적)
          viewMenu.submenu.push({ type: 'separator' });
          viewMenu.submenu.push({
            label: t('menu.view.theme'),
            submenu: themeSubmenu,
          });
        }
      }
    }

    // themePackService 경로: setApplicationMenu 1회만 호출
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    return;
  }

  // themePackService 미주입 동기 경로: setApplicationMenu 1회 호출
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
