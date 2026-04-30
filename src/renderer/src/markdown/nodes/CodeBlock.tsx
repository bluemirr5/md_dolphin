// AC9: CodeBlock props { code: string; language: string|undefined }
interface CodeBlockProps {
  readonly code: string;
  readonly language: string | undefined;
}

export function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  return (
    <pre>
      <code className={language !== undefined ? `language-${language}` : undefined}>{code}</code>
    </pre>
  );
}
