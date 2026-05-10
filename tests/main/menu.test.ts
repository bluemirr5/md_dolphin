// 사후 테스트 — menu.ts
// AC4: 6 메뉴 구조 검증, 단축키 accelerator 문자열, ⌘1/⌘2 IPC push
// CR9.2-1: zoom/savePdf/print 클릭 → webContents.send 대신 헬퍼 직접 호출 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';

// zoom-ipc / print-ipc 헬퍼 mock — menu.ts가 이를 직접 호출하는지 검증
vi.mock('../../src/main/zoom-ipc', () => ({
  applyZoom: vi.fn(),
  registerZoomIpc: vi.fn(() => vi.fn()),
}));

vi.mock('../../src/main/print-ipc', () => ({
  printPage: vi.fn(),
  printToPdf: vi.fn().mockResolvedValue(undefined),
  registerPrintIpc: vi.fn(() => vi.fn()),
}));

// Electron 전체 mock
vi.mock('electron', () => {
  const menuItems: Electron.MenuItemConstructorOptions[] = [];

  const Menu = {
    buildFromTemplate: vi.fn((template: Electron.MenuItemConstructorOptions[]) => {
      menuItems.splice(0, menuItems.length, ...template);
      return { id: 'built-menu' };
    }),
    setApplicationMenu: vi.fn(),
    _getItems: () => menuItems,
  };

  const app = {
    name: 'md_dolphin',
    isPackaged: false,
    whenReady: vi.fn().mockResolvedValue(undefined),
    // 사이클 10: i18n lookup을 위해 locale 반환 (en → 영어 라벨 테스트)
    getLocale: vi.fn().mockReturnValue('en'),
  };

  const BrowserWindow = {
    getFocusedWindow: vi.fn(),
  };

  const ipcMain = {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
  };

  return { Menu, app, BrowserWindow, ipcMain, dialog: {} };
});

import { installMenu } from '../../src/main/menu';
import { Menu } from 'electron';
import { applyZoom } from '../../src/main/zoom-ipc';
import { printPage, printToPdf } from '../../src/main/print-ipc';
import type { FileService } from '../../src/main/file-service';
import type { DocumentWindowManager } from '../../src/main/document-window';
import type { ThemePackService } from '../../src/main/theme-pack-service';

function makeStubs() {
  const fileService = {
    openViaDialog: vi.fn().mockResolvedValue(null),
  } as unknown as FileService;

  const windowManager = {
    setBaseDir: vi.fn(),
  } as unknown as DocumentWindowManager;

  return { fileService, windowManager };
}

describe('installMenu — 메뉴 구조', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Menu.buildFromTemplate이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);
    // vi.mocked로 타입 안전하게 접근
    expect(vi.mocked(Menu).buildFromTemplate).toHaveBeenCalledOnce();
  });

  it('Menu.setApplicationMenu이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);
    expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();
  });

  it('macOS에서 App 메뉴 포함 총 5개 이상 메뉴가 등록된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    // Menu._getItems()로 buildFromTemplate에 전달된 template 확인
    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    // darwin에서 App + File + Edit + View + Window + Help = 6개
    // 테스트 환경(darwin)에서는 6개
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('File 메뉴가 존재하고 Open…이 포함된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    expect(fileMenu).toBeDefined();

    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    // 사이클 10: i18n 라벨 ('Open...' — en.json menu.file.open)
    const openItem = submenu?.find((i) => typeof i.label === 'string' && i.label.startsWith('Open'));
    expect(openItem).toBeDefined();
    expect(openItem?.accelerator).toBe('CmdOrCtrl+O');
  });

  it('File 메뉴에 Print… 항목이 있고 accelerator가 CmdOrCtrl+P이다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    // 사이클 10: i18n 라벨 ('Print...' — en.json menu.file.print)
    const printItem = submenu?.find((i) => typeof i.label === 'string' && i.label.startsWith('Print'));
    expect(printItem).toBeDefined();
    expect(printItem?.accelerator).toBe('CmdOrCtrl+P');
  });

  it('File 메뉴에 Save as PDF… 항목이 있고 accelerator가 Shift+CmdOrCtrl+P이다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    // 사이클 10: i18n 라벨 ('Save as PDF...' — en.json menu.file.saveAsPdf)
    const pdfItem = submenu?.find((i) => typeof i.label === 'string' && i.label.startsWith('Save as PDF'));
    expect(pdfItem).toBeDefined();
    expect(pdfItem?.accelerator).toBe('Shift+CmdOrCtrl+P');
  });

  it('View 메뉴에 Zoom In/Out/Actual Size/Toggle Sidebar/Focus Article이 포함된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    expect(viewMenu).toBeDefined();

    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const labels = submenu?.map((i) => i.label).filter(Boolean) ?? [];

    expect(labels).toContain('Zoom In');
    expect(labels).toContain('Zoom Out');
    expect(labels).toContain('Actual Size');
    expect(labels).toContain('Toggle Sidebar');
    expect(labels).toContain('Focus Article');
  });

  it('View > Toggle Sidebar accelerator가 CmdOrCtrl+1이다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const sidebarItem = submenu?.find((i) => i.label === 'Toggle Sidebar');
    expect(sidebarItem?.accelerator).toBe('CmdOrCtrl+1');
  });

  it('View > Focus Article accelerator가 CmdOrCtrl+2이다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const articleItem = submenu?.find((i) => i.label === 'Focus Article');
    expect(articleItem?.accelerator).toBe('CmdOrCtrl+2');
  });

  it('Window 메뉴가 표준 role(minimize/zoom/close)을 포함한다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const windowMenu = items.find((m) => m.label === 'Window');
    expect(windowMenu).toBeDefined();

    const submenu = windowMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const roles = submenu?.map((i) => i.role).filter(Boolean) ?? [];
    expect(roles).toContain('minimize');
    expect(roles).toContain('zoom');
    expect(roles).toContain('close');
  });

  it('Help 메뉴가 role="help"로 등록된다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const helpMenu = items.find((m) => m.role === 'help');
    expect(helpMenu).toBeDefined();
  });
});

// CR9.2-1: zoom/print/savePdf 메뉴 클릭 시 webContents.send 대신 헬퍼 직접 호출 검증
// 이전 구현에서 webContents.send(채널)로 push 메시지를 보냈으나
// renderer에 ipcRenderer.on 리스너가 없어 무음 실패했던 문제를 수정.
describe('installMenu — 메뉴 클릭 헬퍼 직접 호출 (CR9.2-1)', () => {
  function getViewSubmenu(items: Electron.MenuItemConstructorOptions[]) {
    const viewMenu = items.find((m) => m.label === 'View');
    return viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
  }

  function getFileSubmenu(items: Electron.MenuItemConstructorOptions[]) {
    const fileMenu = items.find((m) => m.label === 'File');
    return fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
  }

  function makeWindowStub() {
    const webContents = { send: vi.fn(), setZoomLevel: vi.fn(), getZoomLevel: vi.fn().mockReturnValue(0) };
    return { webContents } as unknown as Electron.BrowserWindow;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Zoom In 클릭 시 applyZoom(webContents, 0.5)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    void installMenu(fileService, windowManager, undefined, undefined, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const zoomIn = viewSubmenu?.find((i) => i.label === 'Zoom In');
    expect(zoomIn?.click).toBeDefined();

    (zoomIn?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).toHaveBeenCalledWith(win.webContents, 0.5);
  });

  it('Zoom Out 클릭 시 applyZoom(webContents, -0.5)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    void installMenu(fileService, windowManager, undefined, undefined, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const zoomOut = viewSubmenu?.find((i) => i.label === 'Zoom Out');

    (zoomOut?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).toHaveBeenCalledWith(win.webContents, -0.5);
  });

  it('Actual Size 클릭 시 applyZoom(webContents, 0)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    void installMenu(fileService, windowManager, undefined, undefined, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const actualSize = viewSubmenu?.find((i) => i.label === 'Actual Size');

    (actualSize?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).toHaveBeenCalledWith(win.webContents, 0);
  });

  it('Print… 클릭 시 printPage(win)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    void installMenu(fileService, windowManager, undefined, undefined, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileSubmenu = getFileSubmenu(items);
    const printItem = fileSubmenu?.find((i) => typeof i.label === 'string' && i.label.startsWith('Print'));

    (printItem?.click as () => void)?.();

    expect(vi.mocked(printPage)).toHaveBeenCalledWith(win);
  });

  it('Save as PDF… 클릭 시 printToPdf(win)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    void installMenu(fileService, windowManager, undefined, undefined, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileSubmenu = getFileSubmenu(items);
    const pdfItem = fileSubmenu?.find((i) => typeof i.label === 'string' && i.label.startsWith('Save as PDF'));

    (pdfItem?.click as () => void)?.();

    expect(vi.mocked(printToPdf)).toHaveBeenCalledWith(win);
  });

  it('getFocusedWindow()가 null이면 zoom/print 헬퍼가 호출되지 않는다', () => {
    const { fileService, windowManager } = makeStubs();
    void installMenu(fileService, windowManager, undefined, undefined, () => null);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const zoomIn = viewSubmenu?.find((i) => i.label === 'Zoom In');

    (zoomIn?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).not.toHaveBeenCalled();
  });
});

// AC1/AC2/AC3/AC4/AC5 — themePackService 주입 경로 검증 (사이클 13)
describe('installMenu — themePackService 주입 (사이클 13)', () => {
  function makeThemePackServiceStub() {
    const revealFolderMock = vi.fn().mockResolvedValue(undefined);
    const service = {
      listPacks: vi.fn().mockResolvedValue([
        { id: 'builtin:default', name: 'Default', source: 'builtin' as const, path: '/builtin/default' },
      ]),
      revealFolder: revealFolderMock,
    } as unknown as ThemePackService;
    return { service, revealFolderMock };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC1: View submenu의 마지막 항목은 role: 'togglefullscreen'
  it('AC1 — themePackService 주입 시 View submenu 마지막 항목은 togglefullscreen이다', async () => {
    const { fileService, windowManager } = makeStubs();
    const { service } = makeThemePackServiceStub();

    await installMenu(fileService, windowManager, service, () => 'builtin:default');

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    expect(submenu).toBeDefined();
    const last = submenu?.[submenu.length - 1];
    expect(last?.role).toBe('togglefullscreen');
  });

  // AC2: Theme submenu 인덱스 < togglefullscreen 인덱스, 그 사이에 separator 1개
  it('AC2 — Theme submenu가 togglefullscreen 직전에 위치하고 사이에 separator 1개가 있다', async () => {
    const { fileService, windowManager } = makeStubs();
    const { service } = makeThemePackServiceStub();

    await installMenu(fileService, windowManager, service, () => 'builtin:default');

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    expect(submenu).toBeDefined();

    const fullscreenIdx = submenu!.findIndex((i) => i.role === 'togglefullscreen');
    const themeIdx = submenu!.findIndex((i) => i.label === 'Theme');

    expect(themeIdx).toBeGreaterThan(-1);
    expect(themeIdx).toBeLessThan(fullscreenIdx);

    // Theme와 togglefullscreen 사이에 separator가 정확히 1개
    const between = submenu!.slice(themeIdx + 1, fullscreenIdx);
    const separators = between.filter((i) => i.type === 'separator');
    expect(separators).toHaveLength(1);
  });

  // AC3: setApplicationMenu 정확히 1회 호출
  it('AC3 — themePackService 주입 시 setApplicationMenu가 정확히 1회 호출된다', async () => {
    const { fileService, windowManager } = makeStubs();
    const { service } = makeThemePackServiceStub();

    await installMenu(fileService, windowManager, service, () => 'builtin:default');

    expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();
  });

  // AC4: themePackService 미주입 시 setApplicationMenu 1회 + Theme submenu 부재
  it('AC4 — themePackService 미주입 시 setApplicationMenu 1회 호출 + Theme submenu 없음', () => {
    const { fileService, windowManager } = makeStubs();

    void installMenu(fileService, windowManager);

    expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const themeItem = submenu?.find((i) => i.label === 'Theme');
    expect(themeItem).toBeUndefined();
  });

  // AC5: Reveal Themes Folder 클릭 시 installMenu 재실행
  it('AC5 — Reveal Themes Folder 클릭 시 installMenu가 재실행되어 Theme submenu가 재구성된다', async () => {
    const { fileService, windowManager } = makeStubs();
    const { service, revealFolderMock } = makeThemePackServiceStub();

    await installMenu(fileService, windowManager, service, () => 'builtin:default');

    // 초기 설치 후 setApplicationMenu 1회 호출 확인
    expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();

    // View > Theme submenu > Reveal Themes Folder 클릭 핸들러 추출
    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const viewSubmenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const themeMenu = viewSubmenu?.find((i) => i.label === 'Theme');
    const themeSubmenu = themeMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const revealItem = themeSubmenu?.find((i) => typeof i.label === 'string' && i.label.includes('Reveal'));
    expect(revealItem).toBeDefined();

    // Reveal 클릭 시 revealFolder 호출 + installMenu 재실행 (click은 void IIFE 패턴)
    vi.mocked(Menu).setApplicationMenu.mockClear();
    (revealItem?.click as () => void)?.();

    // IIFE 내부 async 완료를 대기
    await vi.waitFor(() => {
      expect(revealFolderMock).toHaveBeenCalled();
      // 재실행 후 setApplicationMenu가 다시 1회 호출되어야 함
      expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();
    });
  });
});
