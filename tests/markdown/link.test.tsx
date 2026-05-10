// 사후 RTL: AC6·AC7 Link 컴포넌트 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Link } from '../../src/renderer/src/markdown/nodes/Link';

// window.api.openExternal mock
const mockOpenExternal = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: { openExternal: mockOpenExternal },
    writable: true,
    configurable: true,
  });
});

describe('Link — 외부 URL IPC (AC6)', () => {
  it('https 링크 클릭 시 window.api.openExternal이 호출된다', () => {
    const { container } = render(<Link href="https://github.com">GitHub</Link>);
    const a = container.querySelector('a')!;
    fireEvent.click(a);
    expect(mockOpenExternal).toHaveBeenCalledWith('https://github.com');
  });

  it('http 링크도 openExternal이 호출된다', () => {
    const { container } = render(<Link href="http://example.com">Example</Link>);
    const a = container.querySelector('a')!;
    fireEvent.click(a);
    expect(mockOpenExternal).toHaveBeenCalledWith('http://example.com');
  });

  it('링크 클릭 시 기본 네비게이션이 차단된다 (preventDefault)', () => {
    const { container } = render(<Link href="https://example.com">link</Link>);
    const a = container.querySelector('a')!;
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });
});

describe('Link — rel 속성·툴팁 (AC7)', () => {
  it('외부 링크에 target="_blank" 속성이 있다', () => {
    const { container } = render(<Link href="https://example.com">링크A</Link>);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
  });

  it('외부 링크에 rel="noreferrer noopener" 속성이 있다', () => {
    const { container } = render(<Link href="https://example.com">링크B</Link>);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('외부 링크에 data-tooltip 속성(URL)이 있다', () => {
    const { container } = render(<Link href="https://example.com">링크C</Link>);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('data-tooltip')).toBe('https://example.com');
  });

  it('내부/앵커 링크는 target/_blank 없음', () => {
    const { container } = render(<Link href="#section">섹션</Link>);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('target')).toBeNull();
  });
});
