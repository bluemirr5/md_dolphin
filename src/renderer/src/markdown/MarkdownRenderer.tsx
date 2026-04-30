import type { ReactNode } from 'react';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownDocument } from '@shared/markdown/document';
import type { HeadingLevel } from '@shared/markdown/heading';
import { renderTokens } from './adapter';
import { HeadingNode } from './nodes/Heading';
import { Paragraph } from './nodes/Paragraph';
import { Link } from './nodes/Link';
import { InlineCode } from './nodes/InlineCode';
import { CodeBlock } from './nodes/CodeBlock';

// 내부 블록 표현 — 외부 미노출 (사이클 9 react-virtuoso 교체 용이성 확보)
interface Block {
  readonly kind: string;
  readonly element: ReactNode;
  readonly key: string;
}

// 인라인 토큰 배열을 React 노드 배열로 변환 (내부 전용)
function renderInlineTokens(tokens: readonly Token[], keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) {
      i++;
      continue;
    }

    if (token.type === 'text' || token.type === 'softbreak') {
      const text = token.type === 'softbreak' ? ' ' : token.content;
      nodes.push(<span key={`${keyPrefix}-text-${i}`}>{text}</span>);
    } else if (token.type === 'code_inline') {
      nodes.push(<InlineCode key={`${keyPrefix}-code-${i}`} content={token.content} />);
    } else if (token.type === 'link_open') {
      // link_open ... link_close 사이의 텍스트 수집
      const href = token.attrGet('href') ?? '#';
      const innerTokens: Token[] = [];
      i++;
      while (i < tokens.length && tokens[i]?.type !== 'link_close') {
        const t = tokens[i];
        if (t) innerTokens.push(t);
        i++;
      }
      const linkContent = innerTokens
        .filter((t) => t.type === 'text')
        .map((t) => t.content)
        .join('');
      nodes.push(
        <Link key={`${keyPrefix}-link-${i}`} href={href}>
          {linkContent}
        </Link>,
      );
    } else if (token.type === 'strong_open' || token.type === 'em_open') {
      const Tag = token.type === 'strong_open' ? 'strong' : 'em';
      const innerTokens: Token[] = [];
      const closeType = token.type === 'strong_open' ? 'strong_close' : 'em_close';
      i++;
      while (i < tokens.length && tokens[i]?.type !== closeType) {
        const t = tokens[i];
        if (t) innerTokens.push(t);
        i++;
      }
      const text = innerTokens
        .filter((t) => t.type === 'text')
        .map((t) => t.content)
        .join('');
      nodes.push(<Tag key={`${keyPrefix}-em-${i}`}>{text}</Tag>);
    }

    i++;
  }

  return nodes;
}

// 토큰 스트림에서 Block 배열을 생성 (내부 전용 — renderTokensToReact와 동일 역할)
function tokenStreamToBlocks(tokens: readonly Token[]): readonly Block[] {
  const blocks: Block[] = [];
  let blockIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    const key = `block-${blockIndex++}`;

    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.slice(1), 10) as HeadingLevel;
      const inlineToken = tokens[i + 1];
      const children =
        inlineToken?.type === 'inline'
          ? renderInlineTokens(inlineToken.children ?? [], key)
          : null;

      // heading_open, inline, heading_close — 3 토큰 소비
      const anchorAttr = token.attrGet('id');
      const anchor = anchorAttr ?? '';

      blocks.push({
        kind: 'heading',
        key,
        element: (
          <HeadingNode key={key} level={level} anchor={anchor}>
            {children}
          </HeadingNode>
        ),
      });
      i += 2; // inline + heading_close 스킵
    } else if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1];
      const children =
        inlineToken?.type === 'inline'
          ? renderInlineTokens(inlineToken.children ?? [], key)
          : null;
      blocks.push({
        kind: 'paragraph',
        key,
        element: <Paragraph key={key}>{children}</Paragraph>,
      });
      i += 2; // inline + paragraph_close 스킵
    } else if (token.type === 'fence') {
      // 코드블록: info가 언어 식별자 (없으면 undefined)
      const lang = token.info.trim() !== '' ? token.info.trim() : undefined;
      blocks.push({
        kind: 'code_block',
        key,
        element: <CodeBlock key={key} code={token.content} language={lang} />,
      });
    } else if (token.type === 'code_block') {
      // 들여쓰기 코드블록 (언어 없음)
      blocks.push({
        kind: 'code_block',
        key,
        element: <CodeBlock key={key} code={token.content} language={undefined} />,
      });
    }
    // bullet_list, ordered_list 등은 사이클 5에서 GFM과 함께 처리
  }

  return blocks;
}

interface MarkdownRendererProps {
  readonly document: MarkdownDocument;
}

// AC8: 빈 rawText에도 <article> wrapper 존재
export function MarkdownRenderer({ document }: MarkdownRendererProps): JSX.Element {
  const tokens = renderTokens(document.rawText);
  const blocks = tokenStreamToBlocks(tokens);

  return <article>{blocks.map((b) => b.element)}</article>;
}
