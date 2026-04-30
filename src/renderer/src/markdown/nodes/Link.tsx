import type { ReactNode } from 'react';

interface LinkProps {
  readonly href: string;
  readonly children: ReactNode;
}

const SAFE_HREF_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

// URL 파싱 실패(상대경로·anchor 등)는 '#'으로 안전 폴백. javascript: 등 비허용 스킴 차단.
function safeguardHref(href: string): string {
  try {
    return SAFE_HREF_PROTOCOLS.has(new URL(href).protocol) ? href : '#';
  } catch {
    return href.startsWith('#') ? href : '#';
  }
}

// [SEC] 외부 링크: target=_blank + rel="noopener noreferrer" 의무 (AC7)
// 클릭 시 Electron의 setWindowOpenHandler가 시스템 브라우저로 위임함
export function Link({ href, children }: LinkProps): JSX.Element {
  return (
    <a href={safeguardHref(href)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
