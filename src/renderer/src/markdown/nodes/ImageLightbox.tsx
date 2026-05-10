import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  readonly src: string;
  readonly alt: string;
  readonly onClose: () => void;
}

// focusable 요소 선택자 — 라이트박스 내부 focusable 탐색용
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 이미지 라이트박스 모달.
 *
 * - ESC / 오버레이 클릭 / 닫기 버튼으로 종료
 * - focus trap: Tab/Shift+Tab을 가로채 모달 내부만 순환
 * - body scroll lock: 오픈 시 overflow:hidden 적용, 종료 시 복원
 * - 닫기 버튼 aria-label="닫기"
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps): JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // portal container: document.body에 직접 portal하지 않고 전용 div를 생성/삭제
  // testing-library 환경에서 document.body 충돌 방지
  const [portalContainer] = useState<HTMLDivElement>(() => {
    const div = document.createElement('div');
    div.setAttribute('data-lightbox-portal', '');
    document.body.appendChild(div);
    return div;
  });

  useEffect(() => {
    return () => {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, [portalContainer]);

  // body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // 오픈 시 닫기 버튼에 focus
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // ESC 키 처리
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // focus trap — Tab/Shift+Tab 순환
  function handleTrapKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusables = Array.from(
      overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled'));

    if (focusables.length === 0) return;

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      // Shift+Tab: 첫 focusable에서 → 마지막 focusable로 순환
      if (active === first || !overlay.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 마지막 focusable에서 → 첫 focusable로 순환
      if (active === last || !overlay.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>): void {
    // 오버레이 배경 클릭 시 종료 (이미지 자체 클릭은 버블링 차단)
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const modal = (
    <div
      ref={overlayRef}
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={handleOverlayClick}
      onKeyDown={handleTrapKeyDown}
    >
      <button
        ref={closeButtonRef}
        className="lightbox-close"
        aria-label="닫기"
        onClick={onClose}
      >
        ✕
      </button>
      <img
        className="lightbox-image"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  return createPortal(modal, portalContainer);
}
