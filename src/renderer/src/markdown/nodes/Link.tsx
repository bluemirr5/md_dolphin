import type { ReactNode } from 'react';

interface LinkProps {
  readonly href: string;
  readonly children: ReactNode;
}

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

// href가 외부 URL인지 판정
function isExternalUrl(href: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

// URL 파싱 실패(상대경로·anchor 등)는 '#'으로 안전 폴백. javascript: 등 비허용 스킴 차단.
function safeguardHref(href: string): string {
  if (isExternalUrl(href)) return href;
  try {
    // 파싱 성공했지만 외부 URL 아닌 경우 (javascript: 등)
    new URL(href);
    return '#';
  } catch {
    return href.startsWith('#') ? href : '#';
  }
}

// [SEC] 외부 링크: target=_blank + rel="noreferrer noopener" 의무 (AC7)
// 클릭 시 window.api.openExternal(url) 호출 — 사이클 3 IPC 채널 재사용 (P7-1)
// hover/focus 시 툴팁(커스텀) — title 속성 대신 data-tooltip + CSS ::after
export function Link({ href, children }: LinkProps): JSX.Element {
  const external = isExternalUrl(href);
  const safeHref = safeguardHref(href);

  if (external) {
    function handleClick(event: React.MouseEvent<HTMLAnchorElement>): void {
      event.preventDefault();
      void window.api.openExternal(href).catch((err: unknown) => {
        console.warn('[Link] openExternal 실패:', err);
      });
    }

    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noreferrer noopener"
        className="md-link md-link--external"
        data-tooltip={href}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={safeHref} className="md-link">
      {children}
    </a>
  );
}
