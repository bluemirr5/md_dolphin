// 사후 R1 — zoom-bridge initZoomBridge cleanup 회귀 보강 (CR10-6)
// initZoomBridge() 호출 → cleanup 함수 반환 → cleanup 호출 시 IPC 리스너 해제 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initZoomBridge, zoomLevelToFontScale, applyFontScale } from '../../src/renderer/src/zoom-bridge';

describe('zoom-bridge — initZoomBridge cleanup', () => {
  beforeEach(() => {
    // --font-scale CSS 변수 적용 타겟 stub
    document.documentElement.style.removeProperty('--font-scale');
  });

  it('initZoomBridge()는 cleanup 함수를 반환한다', () => {
    const onZoomChangedCleanup = vi.fn();
    const mockApi = {
      onZoomChanged: vi.fn().mockReturnValue(onZoomChangedCleanup),
    };
    // window.api mock 주입
    Object.defineProperty(globalThis, 'window', {
      value: { ...globalThis.window, api: mockApi },
      configurable: true,
      writable: true,
    });

    const cleanup = initZoomBridge();

    expect(typeof cleanup).toBe('function');
    expect(mockApi.onZoomChanged).toHaveBeenCalledOnce();
  });

  it('cleanup 호출 시 onZoomChanged IPC 리스너가 해제된다', () => {
    const onZoomChangedCleanup = vi.fn();
    const mockApi = {
      onZoomChanged: vi.fn().mockReturnValue(onZoomChangedCleanup),
    };
    Object.defineProperty(globalThis, 'window', {
      value: { ...globalThis.window, api: mockApi },
      configurable: true,
      writable: true,
    });

    const cleanup = initZoomBridge();
    cleanup();

    expect(onZoomChangedCleanup).toHaveBeenCalledOnce();
  });

  it('onZoomChanged 콜백이 호출되면 --font-scale CSS 변수가 갱신된다', () => {
    let capturedCallback: ((zoomLevel: number) => void) | null = null;
    const onZoomChangedCleanup = vi.fn();
    const mockApi = {
      onZoomChanged: vi.fn((cb: (zoomLevel: number) => void) => {
        capturedCallback = cb;
        return onZoomChangedCleanup;
      }),
    };
    Object.defineProperty(globalThis, 'window', {
      value: { ...globalThis.window, api: mockApi },
      configurable: true,
      writable: true,
    });

    initZoomBridge();

    // zoomLevel=1 → font-scale=1.1
    capturedCallback!(1);
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.1');

    // zoomLevel=0 → font-scale=1.0
    capturedCallback!(0);
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1');

    // zoomLevel=-2 → font-scale=0.8
    capturedCallback!(-2);
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('0.8');
  });
});

describe('zoom-bridge — 순수 함수', () => {
  it('zoomLevelToFontScale: zoomLevel=0 → 1.0', () => {
    expect(zoomLevelToFontScale(0)).toBe(1);
  });

  it('zoomLevelToFontScale: zoomLevel=1 → 1.1', () => {
    expect(zoomLevelToFontScale(1)).toBeCloseTo(1.1);
  });

  it('zoomLevelToFontScale: zoomLevel=-3 → 0.7', () => {
    expect(zoomLevelToFontScale(-3)).toBeCloseTo(0.7);
  });

  it('applyFontScale: CSS 변수 --font-scale 갱신', () => {
    applyFontScale(1.2);
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.2');
  });
});
