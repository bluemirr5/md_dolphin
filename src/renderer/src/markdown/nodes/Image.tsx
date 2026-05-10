import { useState, useRef, useMemo } from 'react';
import { ImageLightbox } from './ImageLightbox';

interface ImageProps {
  readonly src: string;
  readonly alt: string;
  readonly title?: string;
}

// 로컬 이미지 판정: http/https로 시작하지 않으면 로컬 경로 → mddolphin-asset:// 변환
// data: URL은 raster MIME 4종 prefix만 통과, data:image/svg+xml 거부
const RASTER_DATA_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/gif',
  'data:image/webp',
] as const;

function resolveImageSrc(src: string, windowId: number | null): string {
  // 원격 URL — 그대로 사용
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // data: URL — raster 4종만 통과
  if (src.startsWith('data:')) {
    const isRaster = RASTER_DATA_PREFIXES.some((prefix) => src.startsWith(prefix));
    return isRaster ? src : ''; // SVG 등 비허용 → 빈 src (alt 폴백)
  }

  // 로컬 경로 → mddolphin-asset://<windowId>/<relPath>
  if (windowId === null) return '';
  const relPath = src.replace(/^\.?\//, '');
  return `mddolphin-asset://${windowId}/${relPath}`;
}

// P7-10: windowId는 window.api.windowId (contextBridge)로 취득 — window.__windowId 임시 전역 제거
function getWindowId(): number | null {
  const wid: unknown = window.api?.windowId;
  return typeof wid === 'number' ? wid : null;
}

export function Image({ src, alt, title }: ImageProps): JSX.Element {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // CR7-5 흡수: src/alt 기준 useMemo로 props 객체 메모화 → 가상화 환경 리렌더 비용 감소
  const resolvedSrc = useMemo(() => resolveImageSrc(src, getWindowId()), [src]);
  const hasValidSrc = resolvedSrc !== '';

  function handleClick(): void {
    if (hasValidSrc && !loadError) {
      setLightboxOpen(true);
    }
  }

  function handleError(): void {
    setLoadError(true);
  }

  return (
    <figure className="md-image">
      {hasValidSrc && !loadError ? (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          title={title}
          className="md-image__img"
          onClick={handleClick}
          onError={handleError}
        />
      ) : (
        // src 없거나 로드 실패 → alt 텍스트 폴백
        <span className="md-image__fallback" role="img" aria-label={alt}>
          {alt || '[이미지]'}
        </span>
      )}
      {alt && <figcaption className="md-image__caption">{alt}</figcaption>}
      {lightboxOpen && (
        <ImageLightbox
          src={resolvedSrc}
          alt={alt}
          onClose={() => {
            setLightboxOpen(false);
            // focus 복원 — 트리거 이미지로
            imgRef.current?.focus();
          }}
        />
      )}
    </figure>
  );
}
