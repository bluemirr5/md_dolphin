import { ipcMain, BrowserWindow, shell } from 'electron';
import { API_UPDATE_AVAILABLE, API_UPDATE_OPEN_RELEASES } from '@shared/ipc-channels';

const RELEASES_URL = 'https://github.com/bluemirr5/md_dolphin/releases';
const CHECK_DELAY_MS = 5_000;

export async function registerUpdater(): Promise<() => void> {
  // IPC handler registered first (no autoUpdater dependency)
  ipcMain.handle(API_UPDATE_OPEN_RELEASES, async () => {
    await shell.openExternal(RELEASES_URL);
  });

  // electron-updater is CJS; dynamic import avoids ESM named-import static analysis
  // issues when this ESM-compiled main process loads it via the asar module resolver.
  const { autoUpdater } = await import('electron-updater');
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info: { version: string }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(API_UPDATE_AVAILABLE, info.version);
    }
  });

  autoUpdater.on('error', (err: Error) => {
    console.warn('[updater] check failed:', err.message);
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, CHECK_DELAY_MS);

  return () => {
    ipcMain.removeHandler(API_UPDATE_OPEN_RELEASES);
  };
}
