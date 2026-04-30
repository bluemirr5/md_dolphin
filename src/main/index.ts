import { app, BrowserWindow, shell, session } from 'electron';
import { join } from 'node:path';
import { isMacOS } from '@shared/platform';
import { enableSandboxBeforeReady, installSessionSecurity } from './security';

// [SEC] sandbox는 app.whenReady() 이전에 활성화해야 한다
enableSandboxBeforeReady(app);

const isDev = !app.isPackaged;

// [SEC] 외부 브라우저로 열 수 있는 스킴을 제한. javascript:/vbscript:/file: 등 차단.
// 사이클 2에서 마크다운 링크 파싱이 추가될 때 이 헬퍼가 1차 방어선이 됨.
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

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    show: false, // 초기 흰 깜빡임 방지: 'ready-to-show'에서 표시
    backgroundColor: '#FAFAF7', // 라이트 배경 사전 적용 (4.4.1 흰화면 깜빡임 완화)
    titleBarStyle: 'default', // 사이클 4 또는 추후 'hiddenInset' 검토
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, // [SEC] 의무
      nodeIntegration: false, // [SEC] 의무
      sandbox: true, // [SEC] 의무
      webSecurity: true, // [SEC] 의무
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  // 외부 링크는 시스템 기본 브라우저로 (스킴 검증 포함)
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });

  // [SEC] 앱 내 navigation 차단: dev는 ELECTRON_RENDERER_URL 정확 일치, prod는 file://만 허용.
  // http://localhost:* 전체 허용을 제거하여 로컬 공격자의 임의 navigate 유도 차단.
  window.webContents.on('will-navigate', (event, url) => {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
    const allowed =
      isDev && rendererUrl ? url.startsWith(rendererUrl) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });

  // ELECTRON_RENDERER_URL은 electron-vite가 dev 모드에 자동 주입. 미주입 시 file:// fallback (prod 경로).
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
