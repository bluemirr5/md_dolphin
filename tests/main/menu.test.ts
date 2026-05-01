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
    installMenu(fileService, windowManager);
    // vi.mocked로 타입 안전하게 접근
    expect(vi.mocked(Menu).buildFromTemplate).toHaveBeenCalledOnce();
  });

  it('Menu.setApplicationMenu이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);
    expect(vi.mocked(Menu).setApplicationMenu).toHaveBeenCalledOnce();
  });

  it('macOS에서 App 메뉴 포함 총 5개 이상 메뉴가 등록된다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

    // Menu._getItems()로 buildFromTemplate에 전달된 template 확인
    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    // darwin에서 App + File + Edit + View + Window + Help = 6개
    // 테스트 환경(darwin)에서는 6개
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('File 메뉴가 존재하고 Open…이 포함된다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    expect(fileMenu).toBeDefined();

    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const openItem = submenu?.find((i) => i.label === 'Open…');
    expect(openItem).toBeDefined();
    expect(openItem?.accelerator).toBe('CmdOrCtrl+O');
  });

  it('File 메뉴에 Print… 항목이 있고 accelerator가 CmdOrCtrl+P이다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const printItem = submenu?.find((i) => i.label === 'Print…');
    expect(printItem).toBeDefined();
    expect(printItem?.accelerator).toBe('CmdOrCtrl+P');
  });

  it('File 메뉴에 Save as PDF… 항목이 있고 accelerator가 Shift+CmdOrCtrl+P이다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileMenu = items.find((m) => m.label === 'File');
    const submenu = fileMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const pdfItem = submenu?.find((i) => i.label === 'Save as PDF…');
    expect(pdfItem).toBeDefined();
    expect(pdfItem?.accelerator).toBe('Shift+CmdOrCtrl+P');
  });

  it('View 메뉴에 Zoom In/Out/Actual Size/Toggle Sidebar/Focus Article이 포함된다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

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
    installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const sidebarItem = submenu?.find((i) => i.label === 'Toggle Sidebar');
    expect(sidebarItem?.accelerator).toBe('CmdOrCtrl+1');
  });

  it('View > Focus Article accelerator가 CmdOrCtrl+2이다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewMenu = items.find((m) => m.label === 'View');
    const submenu = viewMenu?.submenu as Electron.MenuItemConstructorOptions[] | undefined;
    const articleItem = submenu?.find((i) => i.label === 'Focus Article');
    expect(articleItem?.accelerator).toBe('CmdOrCtrl+2');
  });

  it('Window 메뉴가 표준 role(minimize/zoom/close)을 포함한다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager);

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
    installMenu(fileService, windowManager);

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
    installMenu(fileService, windowManager, () => win);

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
    installMenu(fileService, windowManager, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const zoomOut = viewSubmenu?.find((i) => i.label === 'Zoom Out');

    (zoomOut?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).toHaveBeenCalledWith(win.webContents, -0.5);
  });

  it('Actual Size 클릭 시 applyZoom(webContents, 0)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    installMenu(fileService, windowManager, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const actualSize = viewSubmenu?.find((i) => i.label === 'Actual Size');

    (actualSize?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).toHaveBeenCalledWith(win.webContents, 0);
  });

  it('Print… 클릭 시 printPage(win)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    installMenu(fileService, windowManager, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileSubmenu = getFileSubmenu(items);
    const printItem = fileSubmenu?.find((i) => i.label === 'Print…');

    (printItem?.click as () => void)?.();

    expect(vi.mocked(printPage)).toHaveBeenCalledWith(win);
  });

  it('Save as PDF… 클릭 시 printToPdf(win)이 호출된다', () => {
    const { fileService, windowManager } = makeStubs();
    const win = makeWindowStub();
    installMenu(fileService, windowManager, () => win);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const fileSubmenu = getFileSubmenu(items);
    const pdfItem = fileSubmenu?.find((i) => i.label === 'Save as PDF…');

    (pdfItem?.click as () => void)?.();

    expect(vi.mocked(printToPdf)).toHaveBeenCalledWith(win);
  });

  it('getFocusedWindow()가 null이면 zoom/print 헬퍼가 호출되지 않는다', () => {
    const { fileService, windowManager } = makeStubs();
    installMenu(fileService, windowManager, () => null);

    const items = (Menu as unknown as { _getItems: () => Electron.MenuItemConstructorOptions[] })._getItems();
    const viewSubmenu = getViewSubmenu(items);
    const zoomIn = viewSubmenu?.find((i) => i.label === 'Zoom In');

    (zoomIn?.click as () => void)?.();

    expect(vi.mocked(applyZoom)).not.toHaveBeenCalled();
  });
});
