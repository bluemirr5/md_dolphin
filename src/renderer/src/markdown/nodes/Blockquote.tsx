import type { ReactNode } from 'react';

interface BlockquoteProps {
  readonly children: ReactNode;
}

// 좌측 accent bar — CSS는 blockquote.css에서 관리
// 중첩 시 들여쓰기 누적은 CSS .md-blockquote 내부 .md-blockquote 선택자로 처리
export function Blockquote({ children }: BlockquoteProps): JSX.Element {
  return <blockquote className="md-blockquote">{children}</blockquote>;
}
