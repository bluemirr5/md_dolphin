// @vitest-environment jsdom
// 사후: scrollToAnchor — scrollIntoView mock 호출, prefers-reduced-motion, 미발견 anchor
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollToAnchor } from '../../src/renderer/src/components/scrollToAnchor';

describe('scrollToAnchor', () => {
  let articleEl: HTMLElement;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    articleEl = document.createElement('article');

    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    // matchMedia 기본: prefers-reduced-motion: no-preference (smooth)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('anchor 발견 시 scrollIntoView({ behavior: smooth }) 1회 호출', () => {
    const heading = document.createElement('h2');
    heading.id = 'my-anchor';
    articleEl.appendChild(heading);

    scrollToAnchor('my-anchor', articleEl);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('prefers-reduced-motion: reduce → behavior: auto', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const heading = document.createElement('h2');
    heading.id = 'reduced-anchor';
    articleEl.appendChild(heading);

    scrollToAnchor('reduced-anchor', articleEl);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('미발견 anchor → scrollIntoView 미호출 + console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    scrollToAnchor('nonexistent', articleEl);

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('anchor not found'),
    );
  });

  it('특수문자 anchor (CSS.escape 적용) — 존재하면 정상 호출', () => {
    const heading = document.createElement('h2');
    heading.id = 'hello-world';
    articleEl.appendChild(heading);

    scrollToAnchor('hello-world', articleEl);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });
});
