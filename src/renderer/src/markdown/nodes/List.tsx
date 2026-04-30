import type { ReactNode } from 'react';

interface UnorderedListProps {
  readonly children: ReactNode;
}

export function UnorderedList({ children }: UnorderedListProps): JSX.Element {
  return <ul>{children}</ul>;
}

interface OrderedListProps {
  readonly start?: number | undefined;
  readonly children: ReactNode;
}

// <ol start="N"> 보존 — ordered_list_open 토큰의 attrs[start] 값을 React start prop으로 전달
export function OrderedList({ start, children }: OrderedListProps): JSX.Element {
  return <ol start={start}>{children}</ol>;
}
