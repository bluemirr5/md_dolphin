import type { ReactNode } from 'react';

// text-align:* → align-* className 변환
// CSP style-src 동결 정책: inline style 그대로 전달 금지 (스펙 설계 제약)
export function textAlignToClassName(style: string | null): string | undefined {
  if (!style) return undefined;
  const match = /text-align:(left|center|right)/.exec(style);
  if (!match) return undefined;
  return `align-${match[1]}`;
}

interface ThProps {
  readonly alignClass?: string | undefined;
  readonly children: ReactNode;
}

// <th scope="col"> 의무 — 접근성 설계 제약 (마스터 플랜 6.7)
export function Th({ alignClass, children }: ThProps): JSX.Element {
  return (
    <th scope="col" className={alignClass}>
      {children}
    </th>
  );
}

interface TdProps {
  readonly alignClass?: string | undefined;
  readonly children: ReactNode;
}

export function Td({ alignClass, children }: TdProps): JSX.Element {
  return <td className={alignClass}>{children}</td>;
}

interface TableProps {
  readonly children: ReactNode;
}

export function Table({ children }: TableProps): JSX.Element {
  return <table>{children}</table>;
}

export function Thead({ children }: { readonly children: ReactNode }): JSX.Element {
  return <thead>{children}</thead>;
}

export function Tbody({ children }: { readonly children: ReactNode }): JSX.Element {
  return <tbody>{children}</tbody>;
}

export function Tr({ children }: { readonly children: ReactNode }): JSX.Element {
  return <tr>{children}</tr>;
}
