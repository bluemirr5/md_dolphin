import { app, BrowserWindow, shell, session } from 'electron';
import { join } from 'node:path';
import { isMacOS } from '@shared/platform';
import { enableSandboxBeforeReady, installSessionSecurity } from './security';
import { FileService } from './file-service';
import { DocumentWindowManager } from './document-window';
import { registerIpcHandlers } from './ipc-handlers';
import { registerOpenFileHandler, flushQueueToWindow } from './open-file-handler';
import { installMenu } from './menu';

// [SEC] sandbox는 app.whenReady() 이전에 활성화해야 한다
enableSandboxBeforeReady(app);

const isDev = !app.isPackaged;

// [SEC] 외부 브라우저로 열 수 있는 스킴을 제한
const SAFE_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:', 'mailto:']);

function openExternalSafe(url: string): void {
  try {
    const parsed = new URL(url);
    if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      void shell.openExternal(url);
    }
  } catch {
    // 잘못된 URL — 무시
  }
}

// 앱 전역 싱글턴 서비스
const fileService = new FileService();
const windowManager = new DocumentWindowManager();

// macOS open-file 핸들러 등록 (whenReady 이전 큐잉 시작)
registerOpenFileHandler(app);

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor: '#FAFAF7',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // DocumentWindowManager에 등록 — close 시 자동 dispose
  windowManager.register(window, undefined);

  window.once('ready-to-show', () => {
    window.show();
    // open-file 큐를 flush — Finder 더블클릭 콜드 스타트 처리
    flushQueueToWindow(window);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
    const allowed =
      isDev && rendererUrl ? url.startsWith(rendererUrl) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

void app.whenReady().then(() => {
  // [SEC] session.defaultSession은 whenReady() 이후에 안정적으로 접근 가능
  installSessionSecurity(session.defaultSession, isDev);

  // IPC 핸들러 등록
  registerIpcHandlers(fileService, windowManager);

  // 메뉴 설치 — fileService + windowManager 주입
  installMenu(fileService, windowManager);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS 표준 동작: dock 유지, 사용자가 명시 종료할 때만 quit.
  if (!isMacOS()) {
    app.quit();
  }
});
