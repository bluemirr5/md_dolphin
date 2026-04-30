interface InlineCodeProps {
  readonly content: string;
}

export function InlineCode({ content }: InlineCodeProps): JSX.Element {
  return <code>{content}</code>;
}
