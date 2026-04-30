import type { ReactNode } from 'react';

interface StrikethroughProps {
  readonly children: ReactNode;
}

// ~~text~~ → <del>{children}</del>
export function Strikethrough({ children }: StrikethroughProps): JSX.Element {
  return <del>{children}</del>;
}
