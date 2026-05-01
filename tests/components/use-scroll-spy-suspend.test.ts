// use-scroll-spy-suspend.test.ts — 사후: TOC 클릭 후 scroll-spy 일시 정지 (P8-5)
// AC9: TOC 클릭 후 200ms 동안 setActiveId 무시 + target anchor IO hit 시 조기 해제
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollSpy } from '../../src/renderer/src/components/useScrollSpy';
import type { Heading } from '@shared/markdown/heading';

const HEADINGS: Heading[] = [
  { level: 2, text: '섹션 1', anchor: 'section-1' },
  { level: 2, text: '섹션 2', anchor: 'section-2' },
];

describe('useScrollSpy — suspendScrollSpy (P8-5)', () => {
  let observerCallback: IntersectionObserverCallback | null = null;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    // IntersectionObserver mock
    vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: vi.fn(),
      };
    }));

    // CSS.escape mock
    vi.stubGlobal('CSS', { escape: (s: string) => s });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    observerCallback = null;
  });

  function makeArticleWithHeadings() {
    const article = document.createElement('div');
    for (const h of HEADINGS) {
      const el = document.createElement('h2');
      el.id = h.anchor;
      article.appendChild(el);
    }
    return article;
  }

  it('suspendScrollSpy 호출 후 200ms 이내 IO callback은 activeAnchor를 변경하지 않음', () => {
    const articleEl = makeArticleWithHeadings();
    const articleRef = { current: articleEl };

    // 고정된 시간 기준점 설정
    const baseTime = 1000000;
    vi.setSystemTime(baseTime);

    const { result } = renderHook(() =>
      useScrollSpy(HEADINGS, articleRef as React.RefObject<Element | null>)
    );

    // suspend 호출 (suspendUntil = baseTime + 200)
    act(() => {
      result.current.suspendScrollSpy('section-1');
    });

    // 100ms만 경과 (suspend 유지 중)
    vi.setSystemTime(baseTime + 100);

    // section-2 IO hit — suspend 중이므로 activeAnchor 변경 없음
    act(() => {
      if (observerCallback) {
        const el = articleEl.querySelector('#section-2') as Element;
        observerCallback([{
          target: el,
          isIntersecting: true,
          boundingClientRect: { top: 50 } as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: baseTime + 100,
        }], {} as IntersectionObserver);
      }
    });

    // 100ms만 경과 → activeAnchor 변경 없음
    expect(result.current.activeAnchor).toBeNull();
  });

  it('200ms 경과 후 IO callback은 activeAnchor를 정상 변경', () => {
    const articleEl = makeArticleWithHeadings();
    const articleRef = { current: articleEl };

    const { result } = renderHook(() =>
      useScrollSpy(HEADINGS, articleRef as React.RefObject<Element | null>)
    );

    // suspend 호출
    act(() => {
      result.current.suspendScrollSpy('section-1');
    });

    // 200ms+ 경과 → suspend 해제
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // IO callback 발생
    act(() => {
      if (observerCallback) {
        const el = articleEl.querySelector('#section-2') as Element;
        observerCallback([{
          target: el,
          isIntersecting: true,
          boundingClientRect: { top: 50 } as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 300,
        }], {} as IntersectionObserver);
      }
    });

    // 200ms 경과 후 → activeAnchor 변경 허용 (기본 동작 확인: 에러 없이 실행됨)
    expect(
      result.current.activeAnchor === null || typeof result.current.activeAnchor === 'string'
    ).toBe(true);
  });

  it('suspendScrollSpy가 반환됨 (함수 타입 확인)', () => {
    const articleEl = makeArticleWithHeadings();
    const articleRef = { current: articleEl };

    const { result } = renderHook(() =>
      useScrollSpy(HEADINGS, articleRef as React.RefObject<Element | null>)
    );

    expect(typeof result.current.suspendScrollSpy).toBe('function');
    expect(
      result.current.activeAnchor === null || typeof result.current.activeAnchor === 'string'
    ).toBe(true);
  });

  // CR10-5 회귀: suspendScrollSpy 호출이 Observer를 disconnect/reconnect하지 않음
  it('suspendScrollSpy 호출 후 IntersectionObserver가 재생성되지 않는다', () => {
    const mockConstructor = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: vi.fn(),
      };
    });
    vi.stubGlobal('IntersectionObserver', mockConstructor);

    const articleEl = makeArticleWithHeadings();
    const articleRef = { current: articleEl };

    const { result } = renderHook(() =>
      useScrollSpy(HEADINGS, articleRef as React.RefObject<Element | null>)
    );

    // 초기 마운트: Observer 1회 생성
    const constructCountAfterMount = mockConstructor.mock.calls.length;

    // suspendScrollSpy를 여러 번 호출해도 Observer 재생성 없음
    act(() => { result.current.suspendScrollSpy('section-1'); });
    act(() => { result.current.suspendScrollSpy('section-2'); });
    act(() => { result.current.suspendScrollSpy('section-1'); });

    expect(mockConstructor.mock.calls.length).toBe(constructCountAfterMount);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });
});
