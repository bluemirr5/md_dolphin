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
import { Strikethrough } from './nodes/Strikethrough';
import { Table, Thead, Tbody, Tr, Th, Td, textAlignToClassName } from './nodes/Table';
import { UnorderedList, OrderedList } from './nodes/List';
import { ListItem } from './nodes/ListItem';
// 사이클 5: Table, List, ListItem, Strikethrough 신규 도입

// 내부 블록 표현 — 외부 미노출 (사이클 9 react-virtuoso 교체 용이성 확보)
interface Block {
  readonly kind: string;
  readonly element: ReactNode;
  readonly key: string;
}

// html_inline 토큰 콘텐츠에서 checked/disabled 파싱
// markdown-it-task-lists가 생성하는 패턴:
//   <input class="task-list-item-checkbox" disabled="" type="checkbox">
//   <input class="task-list-item-checkbox" checked="" disabled="" type="checkbox">
function parseCheckboxHtmlInline(content: string): { checked: boolean } | null {
  if (!content.includes('type="checkbox"') && !content.includes("type='checkbox'")) return null;
  const checked = content.includes('checked');
  return { checked };
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
      // linkify bare URL도 link_open/link_close 동일 토큰 사용 (스파이크 Q3 확인)
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
    } else if (token.type === 's_open') {
      // ~~strikethrough~~ — s_open ... s_close. 내부 마크업 보존(재귀)
      const innerTokens: Token[] = [];
      i++;
      while (i < tokens.length && tokens[i]?.type !== 's_close') {
        const t = tokens[i];
        if (t) innerTokens.push(t);
        i++;
      }
      const innerNodes = renderInlineTokens(innerTokens, `${keyPrefix}-strike-${i}`);
      nodes.push(
        <Strikethrough key={`${keyPrefix}-strike-${i}`}>{innerNodes}</Strikethrough>,
      );
    } else if (token.type === 'html_inline') {
      // task-list checkbox: html:false 환경에서 html_inline은 렌더링되지 않으므로
      // 직접 React <input>으로 변환 (스파이크 결과: checked=""는 html_inline content에 포함)
      const parsed = parseCheckboxHtmlInline(token.content);
      if (parsed !== null) {
        nodes.push(
          <input
            key={`${keyPrefix}-checkbox-${i}`}
            type="checkbox"
            disabled
            defaultChecked={parsed.checked}
          />,
        );
      }
      // checkbox가 아닌 html_inline은 html:false이므로 무시 (보안)
    }

    i++;
  }

  return nodes;
}

// list_item_open 토큰에서 task-list-item 여부 추출
// markdown-it-task-lists가 li_open에 class="task-list-item" attrs를 추가하고
// inline children[0]에 html_inline으로 checkbox를 prepend (스파이크 Q1 확인)
// checked 상태는 renderInlineTokens에서 html_inline을 <input>으로 직접 변환
function isTaskListItem(listItemOpen: Token): boolean {
  return listItemOpen.attrGet('class') === 'task-list-item';
}

// 리스트 토큰 범위를 찾아 ReactNode를 반환 (재귀 지원)
// 반환: { element, endIndex } — endIndex는 처리 완료한 마지막 토큰 인덱스
function renderListTokens(
  tokens: readonly Token[],
  startIndex: number, // bullet_list_open / ordered_list_open 인덱스
  blockKey: string,
): { element: ReactNode; endIndex: number } {
  const openToken = tokens[startIndex];
  if (!openToken) return { element: null, endIndex: startIndex };

  const isOrdered = openToken.type === 'ordered_list_open';
  const closeType = isOrdered ? 'ordered_list_close' : 'bullet_list_close';
  const startAttr = isOrdered ? openToken.attrGet('start') : null;
  const startNum = startAttr !== null ? parseInt(startAttr, 10) : undefined;

  const listItems: ReactNode[] = [];
  let i = startIndex + 1;
  let itemIndex = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }

    if (token.type === closeType) {
      break;
    }

    if (token.type === 'list_item_open') {
      const liKey = `${blockKey}-li-${itemIndex++}`;
      const taskItem = isTaskListItem(token);
      const liChildren: ReactNode[] = [];
      i++;

      while (i < tokens.length) {
        const inner = tokens[i];
        if (!inner) { i++; continue; }

        if (inner.type === 'list_item_close') {
          break;
        }

        if (inner.type === 'bullet_list_open' || inner.type === 'ordered_list_open') {
          // 중첩 리스트 — 재귀 처리
          const nested = renderListTokens(tokens, i, `${liKey}-nested`);
          liChildren.push(nested.element);
          i = nested.endIndex + 1;
          continue;
        }

        if (inner.type === 'inline') {
          // task-list item의 경우 ListItem이 직접 <input>을 prepend하므로
          // html_inline (checkbox) 토큰은 renderInlineTokens 내부에서 <input>으로 변환됨
          const inlineNodes = renderInlineTokens(inner.children ?? [], liKey);
          liChildren.push(...inlineNodes);
        }
        // paragraph_open/close, hidden tokens 무시

        i++;
      }

      listItems.push(
        <ListItem key={liKey} isTaskItem={taskItem}>
          {liChildren}
        </ListItem>,
      );
    }

    i++;
  }

  const element = isOrdered ? (
    <OrderedList key={blockKey} start={startNum}>
      {listItems}
    </OrderedList>
  ) : (
    <UnorderedList key={blockKey}>{listItems}</UnorderedList>
  );

  return { element, endIndex: i };
}

// 테이블 토큰 범위를 찾아 ReactNode를 반환
function renderTableTokens(
  tokens: readonly Token[],
  startIndex: number, // table_open 인덱스
  blockKey: string,
): { element: ReactNode; endIndex: number } {
  let i = startIndex + 1;
  let theadContent: ReactNode = null;
  let tbodyContent: ReactNode = null;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }

    if (token.type === 'table_close') break;

    if (token.type === 'thead_open') {
      const result = renderTheadTokens(tokens, i, blockKey);
      theadContent = result.element;
      i = result.endIndex + 1;
      continue;
    }

    if (token.type === 'tbody_open') {
      const result = renderTbodyTokens(tokens, i, blockKey);
      tbodyContent = result.element;
      i = result.endIndex + 1;
      continue;
    }

    i++;
  }

  return {
    element: (
      <Table key={blockKey}>
        {theadContent}
        {tbodyContent}
      </Table>
    ),
    endIndex: i,
  };
}

function renderTheadTokens(
  tokens: readonly Token[],
  startIndex: number,
  blockKey: string,
): { element: ReactNode; endIndex: number } {
  let i = startIndex + 1;
  const rows: ReactNode[] = [];
  let rowIndex = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }
    if (token.type === 'thead_close') break;

    if (token.type === 'tr_open') {
      const rowKey = `${blockKey}-thead-tr-${rowIndex++}`;
      const cells: ReactNode[] = [];
      let cellIndex = 0;
      i++;

      while (i < tokens.length) {
        const inner = tokens[i];
        if (!inner) { i++; continue; }
        if (inner.type === 'tr_close') break;

        if (inner.type === 'th_open') {
          const cellKey = `${rowKey}-th-${cellIndex++}`;
          const styleAttr = inner.attrGet('style');
          const alignClass = textAlignToClassName(styleAttr) ?? undefined;
          i++;
          let cellContent: ReactNode[] = [];
          while (i < tokens.length && tokens[i]?.type !== 'th_close') {
            const t = tokens[i];
            if (t?.type === 'inline') {
              cellContent = renderInlineTokens(t.children ?? [], cellKey);
            }
            i++;
          }
          cells.push(
            <Th key={cellKey} alignClass={alignClass}>
              {cellContent}
            </Th>,
          );
        }

        i++;
      }

      rows.push(<Tr key={rowKey}>{cells}</Tr>);
    }

    i++;
  }

  return { element: <Thead key={`${blockKey}-thead`}>{rows}</Thead>, endIndex: i };
}

function renderTbodyTokens(
  tokens: readonly Token[],
  startIndex: number,
  blockKey: string,
): { element: ReactNode; endIndex: number } {
  let i = startIndex + 1;
  const rows: ReactNode[] = [];
  let rowIndex = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }
    if (token.type === 'tbody_close') break;

    if (token.type === 'tr_open') {
      const rowKey = `${blockKey}-tbody-tr-${rowIndex++}`;
      const cells: ReactNode[] = [];
      let cellIndex = 0;
      i++;

      while (i < tokens.length) {
        const inner = tokens[i];
        if (!inner) { i++; continue; }
        if (inner.type === 'tr_close') break;

        if (inner.type === 'td_open') {
          const cellKey = `${rowKey}-td-${cellIndex++}`;
          const styleAttr = inner.attrGet('style');
          const alignClass = textAlignToClassName(styleAttr) ?? undefined;
          i++;
          let cellContent: ReactNode[] = [];
          while (i < tokens.length && tokens[i]?.type !== 'td_close') {
            const t = tokens[i];
            if (t?.type === 'inline') {
              cellContent = renderInlineTokens(t.children ?? [], cellKey);
            }
            i++;
          }
          cells.push(
            <Td key={cellKey} alignClass={alignClass}>
              {cellContent}
            </Td>,
          );
        }

        i++;
      }

      rows.push(<Tr key={rowKey}>{cells}</Tr>);
    }

    i++;
  }

  return { element: <Tbody key={`${blockKey}-tbody`}>{rows}</Tbody>, endIndex: i };
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
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      // ul / ol — renderListTokens가 닫는 토큰까지 소비
      const result = renderListTokens(tokens, i, key);
      blocks.push({ kind: 'list', key, element: result.element });
      i = result.endIndex; // for loop의 i++ 후 다음 토큰으로 이동
    } else if (token.type === 'table_open') {
      // GFM 표 — renderTableTokens가 table_close까지 소비
      const result = renderTableTokens(tokens, i, key);
      blocks.push({ kind: 'table', key, element: result.element });
      i = result.endIndex;
    }
    // blockquote, hr, html_block 등은 사이클 7
  }

  return blocks;
}

interface MarkdownRendererProps {
  readonly document: MarkdownDocument;
}

// AC8: 빈 rawText에도 <article> wrapper 존재
// className="md-content" — CSS 변수·타이포 토큰 스코프 (사이클 4, 설계 제약: prop 변경 없음)
export function MarkdownRenderer({ document }: MarkdownRendererProps): JSX.Element {
  const tokens = renderTokens(document.rawText);
  const blocks = tokenStreamToBlocks(tokens);

  return <article className="md-content">{blocks.map((b) => b.element)}</article>;
}
