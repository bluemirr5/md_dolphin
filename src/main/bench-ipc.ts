// bench-ipc.ts — 콜드 스타트 측정 IPC (dev only)
// AC1 보조: bench:cold-start IPC — app.whenReady → did-finish-load 시각차 노출
// process.env.NODE_ENV !== 'production' 가드 — production 빌드 미노출 (P9-4)
import { ipcMain, app } from 'electron';
import { API_BENCH_COLD_START } from '@shared/ipc-channels';

// 앱 시작 시각 — 가능한 한 빠른 시점에 기록 (module 로드 시)
const APP_START_TIME = Date.now();

export function registerBenchIpc(): (() => void) | null {
  // production 빌드에서는 등록하지 않음 (dev only)
  if (process.env['NODE_ENV'] === 'production') {
    return null;
  }

  let appReadyTime: number | null = null;

  // app.whenReady 시각 기록
  void app.whenReady().then(() => {
    appReadyTime = Date.now();
  });

  const handler = (): { appStart: number; appReady: number | null; elapsed: number | null } => {
    const now = Date.now();
    const elapsed = appReadyTime !== null ? now - APP_START_TIME : null;
    return {
      appStart: APP_START_TIME,
      appReady: appReadyTime,
      elapsed,
    };
  };

  ipcMain.handle(API_BENCH_COLD_START, handler);

  return () => {
    ipcMain.removeHandler(API_BENCH_COLD_START);
  };
}
