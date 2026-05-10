// zoom-ipc.ts — 줌 레벨 IPC 핸들러
// 사이클 9: AC5: ⌘+/⌘- 5회 누적 시 클램프(+3/-3), ⌘0 → 0 복귀
// 사이클 10: setZoomFactor를 1.0으로 고정 — CSS --font-scale 단일 진입점 (P10-4)
//   줌 레벨 변경 시 view:zoom-changed 이벤트로 renderer에 푸시 → zoom-bridge.ts가 --font-scale 갱신
// windowId -1 sentinel 시 IPC noop + console.warn 1회 (CR7-11)
// 사이클 11a (CR10-7): ZOOM_STEP/MIN/MAX → @shared/zoom 단일 진실원으로 통일
import { ipcMain, webContents } from 'electron';
import {
  API_VIEW_ZOOM_IN,
  API_VIEW_ZOOM_OUT,
  API_VIEW_ZOOM_RESET,
  API_VIEW_ZOOM_CHANGED,
} from '@shared/ipc-channels';
import { ZOOM_STEP, ZOOM_MIN, ZOOM_MAX } from '@shared/zoom';

/** 윈도우별 줌 레벨 상태 (webContents.id → zoomLevel) */
const zoomLevels = new Map<number, number>();

/** 테스트용: 줌 레벨 상태 초기화 */
export function _resetZoomLevelsForTest(): void {
  zoomLevels.clear();
}

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
 *
 * 사이클 10: setZoomFactor는 1.0으로 고정.
 * CSS --font-scale 갱신은 view:zoom-changed 이벤트로 renderer에 위임.
 * menu.ts에서 메뉴 클릭 핸들러가 ipcMain.handle 우회 없이 직접 호출.
 */
export function applyZoom(wc: Electron.WebContents, delta: number): void {
  const current = zoomLevels.get(wc.id) ?? 0;
  const next = delta === 0 ? 0 : clamp(current + delta, ZOOM_MIN, ZOOM_MAX);
  zoomLevels.set(wc.id, next);

  // setZoomFactor는 1.0 고정 (P10-4: CSS --font-scale 단일 진입점)
  wc.setZoomFactor(1.0);

  // renderer에 줌 레벨 변경 푸시 → zoom-bridge.ts가 --font-scale 계산
  wc.send(API_VIEW_ZOOM_CHANGED, next);
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
