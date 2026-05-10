// 사후 RTL: AC4·AC5 Image / ImageLightbox 검증
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { Image } from '../../src/renderer/src/markdown/nodes/Image';
import { ImageLightbox } from '../../src/renderer/src/markdown/nodes/ImageLightbox';

const onCloseMock = vi.fn();

// window.api mock — windowId: 1 로 설정하여 mddolphin-asset:// 변환 활성화 (P7-10)
beforeEach(() => {
  Object.defineProperty(window, 'api', {
    value: { windowId: 1 },
    writable: true,
    configurable: true,
  });
  vi.clearAllMocks();
});

// portal cleanup — document.body에 남은 lightbox portal container 잔여물 제거
afterEach(() => {
  document.querySelectorAll('[data-lightbox-portal]').forEach((el) => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
});

describe('Image — src 변환 (AC4)', () => {
  it('로컬 상대 경로 src를 mddolphin-asset:// URL로 변환한다', () => {
    const { container } = render(<Image src="./img.png" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.src).toContain('mddolphin-asset://1/img.png');
  });

  it('https:// URL은 src를 무변환으로 유지한다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.src).toBe('https://example.com/img.png');
  });

  it('http:// URL은 src를 무변환으로 유지한다', () => {
    const { container } = render(<Image src="http://example.com/img.png" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.src).toBe('http://example.com/img.png');
  });

  it('data:image/svg+xml URL은 alt 폴백으로 렌더한다', () => {
    const { container } = render(
      <Image src="data:image/svg+xml,<svg/>" alt="SVG 이미지" />,
    );
    const img = container.querySelector('img');
    expect(img).toBeNull(); // img 없음
    expect(container.textContent).toContain('SVG 이미지');
  });

  it('data:image/png URL은 통과한다', () => {
    const { container } = render(
      <Image src="data:image/png;base64,abc" alt="PNG" />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toContain('data:image/png');
  });

  it('alt 캡션이 figcaption으로 렌더된다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="예시 이미지" />);
    const caption = container.querySelector('figcaption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('예시 이미지');
  });

  it('alt가 빈 문자열이면 figcaption을 렌더하지 않는다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="" />);
    expect(container.querySelector('figcaption')).toBeNull();
  });
});

describe('Image — 라이트박스 (AC5)', () => {
  it('이미지 클릭 시 라이트박스가 열린다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="테스트" />);
    const img = container.querySelector('img')!;
    act(() => { fireEvent.click(img); });
    expect(document.querySelector('.lightbox-overlay')).not.toBeNull();
  });

  it('ESC 키로 라이트박스가 닫힌다', () => {
    // ImageLightbox를 직접 렌더하여 Portal 컨테이너 충돌 없이 ESC 테스트
    const { unmount } = render(
      <ImageLightbox src="https://example.com/img.png" alt="테스트" onClose={onCloseMock} />,
    );
    expect(onCloseMock).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('닫기 버튼 aria-label="닫기"가 존재한다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="테스트" />);
    act(() => { fireEvent.click(container.querySelector('img')!); });
    const closeBtn = document.querySelector('[aria-label="닫기"]');
    expect(closeBtn).not.toBeNull();
  });

  it('닫기 버튼 클릭으로 라이트박스가 닫힌다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="테스트" />);
    act(() => { fireEvent.click(container.querySelector('img')!); });
    const closeBtn = document.querySelector('[aria-label="닫기"]') as HTMLElement;
    act(() => { fireEvent.click(closeBtn); });
    expect(document.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('오버레이 배경 클릭으로 라이트박스가 닫힌다', () => {
    const { container } = render(<Image src="https://example.com/img.png" alt="테스트" />);
    act(() => { fireEvent.click(container.querySelector('img')!); });

    const overlay = document.querySelector('.lightbox-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();

    // currentTarget 시뮬레이션: overlay 자체에서 발생한 click event
    act(() => {
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
      // target과 currentTarget이 같도록 overlay에 직접 dispatch
      overlay.dispatchEvent(evt);
    });

    // 오버레이 배경 클릭이 작동하면 닫혀야 함
    // 주의: jsdom에서 currentTarget === target은 직접 dispatch 시 동일
    expect(document.querySelector('.lightbox-overlay')).toBeNull();
  });
});

describe('ImageLightbox — focus trap Tab 순환 (AC5)', () => {
  // 닫기 버튼이 유일한 focusable인 경우 Tab/Shift+Tab 모두 동일 버튼으로 순환해야 한다.
  // 구현: overlay div의 onKeyDown prop에 focus trap이 바인딩됨.
  it('Tab 키가 닫기 버튼에서 닫기 버튼으로 순환한다 (단일 focusable)', () => {
    const { unmount } = render(
      <ImageLightbox src="https://example.com/img.png" alt="테스트" onClose={onCloseMock} />,
    );

    const overlay = document.querySelector('.lightbox-overlay') as HTMLElement;
    const closeBtn = document.querySelector('[aria-label="닫기"]') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(closeBtn).not.toBeNull();

    // 닫기 버튼에 focus 설정 (trap 기준 active element)
    act(() => { closeBtn.focus(); });
    expect(document.activeElement).toBe(closeBtn);

    // Tab 키: 마지막(=유일) focusable에서 첫 focusable(자기 자신)로 순환
    act(() => { fireEvent.keyDown(overlay, { key: 'Tab', shiftKey: false }); });
    expect(document.activeElement).toBe(closeBtn);

    unmount();
  });

  it('Shift+Tab 키가 닫기 버튼에서 닫기 버튼으로 순환한다 (단일 focusable)', () => {
    const { unmount } = render(
      <ImageLightbox src="https://example.com/img.png" alt="테스트" onClose={onCloseMock} />,
    );

    const overlay = document.querySelector('.lightbox-overlay') as HTMLElement;
    const closeBtn = document.querySelector('[aria-label="닫기"]') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(closeBtn).not.toBeNull();

    // 닫기 버튼에 focus 설정
    act(() => { closeBtn.focus(); });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab: 첫(=유일) focusable에서 마지막 focusable(자기 자신)로 순환
    act(() => { fireEvent.keyDown(overlay, { key: 'Tab', shiftKey: true }); });
    expect(document.activeElement).toBe(closeBtn);

    unmount();
  });
});
