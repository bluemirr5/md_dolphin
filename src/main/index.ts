import { app, BrowserWindow, shell, session, nativeTheme, protocol } from 'electron';
import { join } from 'node:path';
import { isMacOS } from '@shared/platform';
import { enableSandboxBeforeReady, installSessionSecurity, SAFE_EXTERNAL_PROTOCOLS } from './security';
import { FileService } from './file-service';
import { DocumentWindowManager } from './document-window';
import { registerIpcHandlers } from './ipc-handlers';
import { registerOpenFileHandler, flushQueueToWindow } from './open-file-handler';
import { installMenu } from './menu';
import { registerAssetProtocol, ASSET_SCHEME } from './asset-protocol';
import { registerZoomIpc } from './zoom-ipc';
import { registerPrintIpc } from './print-ipc';
import { registerBenchIpc } from './bench-ipc';
import { createThemePackService } from './theme-pack-service';
import { registerUpdater } from './updater';

// BrowserWindow 초기 배경색 — nativeTheme 기반 동적 결정 (DoD B, P4-3)
// ThemeProvider await 동안 첫 paint 색상 일치 → FOUC 방지
const BACKGROUND_COLOR_LIGHT = '#FAFAF7';
const BACKGROUND_COLOR_DARK = '#1C1C1E';

// [SEC] sandbox는 app.whenReady() 이전에 활성화해야 한다
enableSandboxBeforeReady(app);

// [SEC] custom scheme은 app.ready 이전에 registerSchemesAsPrivileged 필요 (Electron 제약)
// secure:true → HTTPS 수준 권한 부여. corsEnabled:false — 렌더러 전용 scheme
protocol.registerSchemesAsPrivileged([
  { scheme: ASSET_SCHEME, privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

const isDev = !app.isPackaged;

app.name = 'MD Dolphin';

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
// 사이클 12: 테마 팩 서비스 (whenReady 이전 생성 OK — app.getPath는 ready 이후에만 안정)
let themePackService: ReturnType<typeof createThemePackService> | undefined;

// macOS open-file 핸들러 등록 (whenReady 이전 큐잉 시작)
registerOpenFileHandler(app);

function createMainWindow(): BrowserWindow {
  // 시스템 테마 기반 초기 배경색 결정 (P4-3)
  const backgroundColor = nativeTheme.shouldUseDarkColors
    ? BACKGROUND_COLOR_DARK
    : BACKGROUND_COLOR_LIGHT;

  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
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
  // dev 모드: 패키지 앱처럼 Dock 아이콘 표시 (production은 번들 .icns 자동 사용)
  if (isDev && isMacOS()) {
    app.dock?.setIcon(join(app.getAppPath(), 'build/icon.icns'));
  }

  // [SEC] session.defaultSession은 whenReady() 이후에 안정적으로 접근 가능
  installSessionSecurity(session.defaultSession, isDev);

  // asset-protocol 등록 — whenReady() 이후 필수
  registerAssetProtocol(windowManager);

  // 사이클 12: 테마 팩 서비스 생성 (app.getPath는 whenReady 이후 안정)
  themePackService = createThemePackService();
  void themePackService.ensureThemesDir();

  // IPC 핸들러 등록 — dispose는 app quit 시 정리
  const disposeIpcHandlers = registerIpcHandlers(fileService, windowManager, themePackService);
  const disposeZoomIpc = registerZoomIpc();
  const disposePrintIpc = registerPrintIpc();
  const disposeBenchIpc = registerBenchIpc();

  // isPackaged 가드 — dev 모드에서 GitHub API 불필요 호출 방지 (설계 제약 AC4)
  let disposeUpdater: (() => void) | undefined;
  if (app.isPackaged) {
    disposeUpdater = registerUpdater();
  }

  app.once('before-quit', () => {
    disposeIpcHandlers();
    disposeZoomIpc();
    disposePrintIpc();
    disposeBenchIpc?.();
    disposeUpdater?.();
  });

  // 활성 테마 id는 renderer localStorage 단일 진실원 — main은 메뉴 radio 갱신용으로만 사용
  const activePackId = 'builtin:default';

  // 메뉴 설치 — fileService + windowManager + themePackService 주입 (fire-and-forget)
  void installMenu(fileService, windowManager, themePackService, () => activePackId);

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
