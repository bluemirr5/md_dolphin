import type { ReactNode } from 'react';
import type { HeadingLevel } from '@shared/markdown';

interface HeadingProps {
  readonly level: HeadingLevel;
  readonly anchor: string;
  readonly children: ReactNode;
}

// H1~H4만 렌더링. H5/H6는 null 반환 (AC6: 도메인에서 보존, 렌더러에서 제외)
export function HeadingNode({ level, anchor, children }: HeadingProps): JSX.Element | null {
  const props = { id: anchor };

  switch (level) {
    case 1:
      return <h1 {...props}>{children}</h1>;
    case 2:
      return <h2 {...props}>{children}</h2>;
    case 3:
      return <h3 {...props}>{children}</h3>;
    case 4:
      return <h4 {...props}>{children}</h4>;
    case 5:
    case 6:
      // H5/H6는 사이클 7에서 렌더 방식 결정. 현재 null 반환 (AC6)
      return null;
  }
}
