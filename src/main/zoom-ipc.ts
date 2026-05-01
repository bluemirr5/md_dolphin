// zoom-ipc.ts — 줌 레벨 IPC 핸들러
// AC5: ⌘+/⌘- 5회 누적 시 클램프(+3/-3), ⌘0 → 0 복귀
// windowId -1 sentinel 시 IPC noop + console.warn 1회 (CR7-11)
import { ipcMain, webContents } from 'electron';
import {
  API_VIEW_ZOOM_IN,
  API_VIEW_ZOOM_OUT,
  API_VIEW_ZOOM_RESET,
} from '@shared/ipc-channels';

// Electron 권고 줌 범위: -3~+3 (약 50%~300%)
const ZOOM_STEP = 0.5;
const ZOOM_MIN = -3;
const ZOOM_MAX = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** sender의 webContents를 windowId로 검증하여 반환. -1 sentinel이면 null */
function resolveWebContents(senderId: number): Electron.WebContents | null {
  if (senderId === -1) {
    console.warn('[zoom-ipc] windowId -1 sentinel — IPC noop');
    return null;
  }
  return webContents.fromId(senderId) ?? null;
}

/**
 * BrowserWindow의 webContents에 직접 줌을 적용한다.
 * delta > 0 → Zoom In, delta < 0 → Zoom Out, delta === 0 → Reset(0)
 * menu.ts에서 메뉴 클릭 핸들러가 ipcMain.handle 우회 없이 직접 호출.
 */
export function applyZoom(wc: Electron.WebContents, delta: number): void {
  if (delta === 0) {
    wc.setZoomLevel(0);
    return;
  }
  const current = wc.getZoomLevel();
  wc.setZoomLevel(clamp(current + delta, ZOOM_MIN, ZOOM_MAX));
}

export function registerZoomIpc(): () => void {
  const handleZoomIn = (_event: Electron.IpcMainInvokeEvent): void => {
    const wc = resolveWebContents(_event.sender.id);
    if (!wc) return;
    applyZoom(wc, ZOOM_STEP);
  };

  const handleZoomOut = (_event: Electron.IpcMainInvokeEvent): void => {
    const wc = resolveWebContents(_event.sender.id);
    if (!wc) return;
    applyZoom(wc, -ZOOM_STEP);
  };

  const handleZoomReset = (_event: Electron.IpcMainInvokeEvent): void => {
    const wc = resolveWebContents(_event.sender.id);
    if (!wc) return;
    applyZoom(wc, 0);
  };

  ipcMain.handle(API_VIEW_ZOOM_IN, handleZoomIn);
  ipcMain.handle(API_VIEW_ZOOM_OUT, handleZoomOut);
  ipcMain.handle(API_VIEW_ZOOM_RESET, handleZoomReset);

  return () => {
    ipcMain.removeHandler(API_VIEW_ZOOM_IN);
    ipcMain.removeHandler(API_VIEW_ZOOM_OUT);
    ipcMain.removeHandler(API_VIEW_ZOOM_RESET);
  };
}
