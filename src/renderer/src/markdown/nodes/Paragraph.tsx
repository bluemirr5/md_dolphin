import type { ReactNode } from 'react';

interface ParagraphProps {
  readonly children: ReactNode;
}

export function Paragraph({ children }: ParagraphProps): JSX.Element {
  return <p>{children}</p>;
}
