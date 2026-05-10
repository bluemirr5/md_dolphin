// zoom.ts — 줌 관련 공유 상수 단일 진실원 (CR10-7)
// main(zoom-ipc.ts, menu.ts)과 renderer(zoom-bridge.ts) 모두 이 파일에서 import.
// 각 파일에 흩어져 있던 상수를 통합.

/** 줌 한 단계 크기 (Electron 권고 단위 = 0.5) */
export const ZOOM_STEP = 0.5;

/** 최소 줌 레벨 (약 50%) */
export const ZOOM_MIN = -3;

/** 최대 줌 레벨 (약 300%) */
export const ZOOM_MAX = 3;
