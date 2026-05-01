// zoom-bridge.ts — 줌 IPC 수신 → --font-scale CSS 변수 갱신 단일 진입점
// 설계 제약 (P10-4):
// - CSS --font-scale 단일 진입점 (setZoomFactor는 main에서 1.0 고정)
// - --font-scale = 1 + zoomLevel * 0.1 계산 (zoomLevel: -3~+3)
// - ⌘0 (zoomLevel=0) → --font-scale: 1.0 (기본값 복귀)
import type { Api } from '../../preload/index';

declare const window: Window & { api: Api };

/**
 * zoomLevel(-3~+3)을 --font-scale 값(0.7~1.3)으로 변환한다.
 * zoomLevel=0 → 1.0, zoomLevel=1 → 1.1, zoomLevel=-1 → 0.9
 */
export function zoomLevelToFontScale(zoomLevel: number): number {
  return 1 + zoomLevel * 0.1;
}

/**
 * --font-scale CSS 변수를 갱신한다.
 * document.documentElement에 직접 적용.
 */
export function applyFontScale(scale: number): void {
  document.documentElement.style.setProperty('--font-scale', String(scale));
}

/**
 * 줌 IPC 이벤트를 구독하여 --font-scale을 갱신한다.
 * App mount 후 1회 호출. 반환 함수로 구독 해제.
 */
export function initZoomBridge(): () => void {
  return window.api.onZoomChanged((zoomLevel: number) => {
    const scale = zoomLevelToFontScale(zoomLevel);
    applyFontScale(scale);
  });
}
