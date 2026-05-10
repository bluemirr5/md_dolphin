import type { ReactNode, Ref, RefObject } from 'react';
import { useRef } from 'react';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownDocument } from '@shared/markdown/document';
import type { HeadingLevel, Outline, OutlineNode } from '@shared/markdown/heading';
import { getCachedTokens } from './adapter';
import { VirtualizedArticle, type VirtuosoScrollHandle } from '../components/VirtualizedArticle';
import { scrollToAnchor } from '../components/scrollToAnchor';

// 사이클 9: VirtualizedArticle 위임은 opt-in 방식
// virtualize=true 시 top-level token을 VirtualizedArticle에 위임
// 기존 테스트 호환성 유지를 위해 기본값은 false (직접 렌더)
import { HeadingNode } from './nodes/Heading';
import { Paragraph } from './nodes/Paragraph';
import { Link } from './nodes/Link';
import { InlineCode } from './nodes/InlineCode';
import { CodeBlock } from './nodes/CodeBlock';
import { Strikethrough } from './nodes/Strikethrough';
import { Table, Thead, Tbody, Tr, Th, Td, textAlignToClassName } from './nodes/Table';
import { UnorderedList, OrderedList } from './nodes/List';
import { ListItem } from './nodes/ListItem';
import { Image } from './nodes/Image';
import { Blockquote } from './nodes/Blockquote';
// 사이클 5: Table, List, ListItem, Strikethrough 신규 도입
// 사이클 7: Image, Blockquote 신규 도입

// 내부 블록 표현 — 외부 미노출 (사이클 9 react-virtuoso 교체 용이성 확보)
// anchor: heading 블록의 id 값 — onJump 핸들러가 blockIndex 매핑에 사용
interface Block {
  readonly kind: string;
  readonly element: ReactNode;
  readonly key: string;
  readonly anchor?: string;
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
      // strong_open/em_open — s_open과 동일 재귀 패턴으로 통일 (부채 ①)
      // text 단순 추출이었던 이전 구현은 **[link](url)** 등 중첩 마크업 손실 유발
      const Tag = token.type === 'strong_open' ? 'strong' : 'em';
      const innerTokens: Token[] = [];
      const closeType = token.type === 'strong_open' ? 'strong_close' : 'em_close';
      i++;
      while (i < tokens.length && tokens[i]?.type !== closeType) {
        const t = tokens[i];
        if (t) innerTokens.push(t);
        i++;
      }
      const innerNodes = renderInlineTokens(innerTokens, `${keyPrefix}-${Tag}-${i}`);
      nodes.push(<Tag key={`${keyPrefix}-${Tag}-${i}`}>{innerNodes}</Tag>);
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
    } else if (token.type === 'image') {
      // 인라인 이미지 — src/alt/title 추출 후 Image 컴포넌트로 렌더
      const src = token.attrGet('src') ?? '';
      const alt = token.children
        ?.filter((t) => t.type === 'text')
        .map((t) => t.content)
        .join('') ?? '';
      const titleAttr = token.attrGet('title');
      const imgProps = titleAttr !== null
        ? { src, alt, title: titleAttr }
        : { src, alt };
      nodes.push(
        <Image key={`${keyPrefix}-image-${i}`} {...imgProps} />,
      );
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

// blockquote 토큰 범위를 찾아 ReactNode를 반환 (재귀 지원 — 중첩 blockquote)
function renderBlockquoteTokens(
  tokens: readonly Token[],
  startIndex: number, // blockquote_open 인덱스
  blockKey: string,
): { element: ReactNode; endIndex: number } {
  let i = startIndex + 1;
  const children: ReactNode[] = [];
  let childIndex = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }

    if (token.type === 'blockquote_close') break;

    const childKey = `${blockKey}-bq-${childIndex++}`;

    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1];
      const nodes =
        inlineToken?.type === 'inline'
          ? renderInlineTokens(inlineToken.children ?? [], childKey)
          : null;
      children.push(<Paragraph key={childKey}>{nodes}</Paragraph>);
      i += 2; // inline + paragraph_close
    } else if (token.type === 'blockquote_open') {
      // 중첩 blockquote — 재귀
      const nested = renderBlockquoteTokens(tokens, i, childKey);
      children.push(nested.element);
      i = nested.endIndex;
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const nested = renderListTokens(tokens, i, childKey);
      children.push(nested.element);
      i = nested.endIndex;
    }

    i++;
  }

  return {
    element: <Blockquote key={blockKey}>{children}</Blockquote>,
    endIndex: i,
  };
}

// inline 토큰 배열에서 첫 번째 image 토큰을 찾는다
function findImageToken(tokens: readonly Token[]): Token | null {
  for (const token of tokens) {
    if (token.type === 'image') return token;
  }
  return null;
}

// outline 트리를 flat headings list로 평탄화 (tokenIndex → anchor 매칭용)
function flattenOutline(nodes: readonly OutlineNode[], acc: { tokenIndex: number; anchor: string }[]): void {
  for (const n of nodes) {
    acc.push({ tokenIndex: n.heading.tokenIndex, anchor: n.heading.anchor });
    if (n.children.length > 0) flattenOutline(n.children, acc);
  }
}

// 토큰 스트림에서 Block 배열을 생성 (내부 전용 — renderTokensToReact와 동일 역할)
// outline 인자: heading anchor를 OutlineExtractor가 만든 slug와 동기화 (사이드바 anchor 일치 보장)
function tokenStreamToBlocks(tokens: readonly Token[], outline?: Outline): readonly Block[] {
  const blocks: Block[] = [];
  let blockIndex = 0;

  // tokenIndex → anchor 맵 (O(1) 조회)
  const anchorByTokenIndex = new Map<number, string>();
  if (outline) {
    const flat: { tokenIndex: number; anchor: string }[] = [];
    flattenOutline(outline.root, flat);
    for (const h of flat) {
      anchorByTokenIndex.set(h.tokenIndex, h.anchor);
    }
  }

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
      // OutlineExtractor가 부여한 anchor를 우선, fallback으로 token id attr (markdown-it anchor plugin 미사용 시 null)
      const anchor = anchorByTokenIndex.get(i) ?? token.attrGet('id') ?? '';

      blocks.push({
        kind: 'heading',
        key,
        anchor,
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
    } else if (token.type === 'blockquote_open') {
      // blockquote_open ... blockquote_close — renderBlockquoteTokens가 소비
      const result = renderBlockquoteTokens(tokens, i, key);
      blocks.push({ kind: 'blockquote', key, element: result.element });
      i = result.endIndex;
    } else if (token.type === 'inline') {
      // 블록 수준 inline 토큰 — image 토큰이 포함될 수 있음
      const imageToken = findImageToken(token.children ?? []);
      if (imageToken !== null) {
        const src = imageToken.attrGet('src') ?? '';
        const alt = imageToken.children
          ?.filter((t) => t.type === 'text')
          .map((t) => t.content)
          .join('') ?? '';
        const titleAttr = imageToken.attrGet('title');
        const imageProps = titleAttr !== null
          ? { src, alt, title: titleAttr }
          : { src, alt };
        blocks.push({
          kind: 'image',
          key,
          element: <Image key={key} {...imageProps} />,
        });
      }
    }
    // hr, html_block 등은 사이클 9+
  }

  return blocks;
}

interface MarkdownRendererProps {
  readonly document: MarkdownDocument;
  /** 외부에서 article 엘리먼트 참조 주입 (useScrollSpy·scrollToAnchor용) */
  readonly articleRef?: Ref<HTMLElement>;
  /**
   * 사이클 9: true 시 top-level Block 배열을 VirtualizedArticle에 위임 (react-virtuoso 가상화).
   * 기본값 false — 기존 직접 렌더 방식 유지 (테스트 호환성 보존).
   * 프로덕션 앱은 App.tsx에서 true로 opt-in.
   */
  readonly virtualize?: boolean;
  /** CR9-6: anchor 점프 폴백용 VirtuosoHandle — virtualize=true 시 VirtualizedArticle에 패스스루 */
  readonly virtuosoRef?: RefObject<VirtuosoScrollHandle | null>;
  /**
   * CR9.2-2: anchor 점프 핸들러 등록 콜백.
   * MarkdownRenderer 마운트 후 내부 jump 함수를 호출자(App.tsx)에 노출한다.
   * 내부 함수: scrollToAnchor 1차 시도 → 실패 시 anchor→blockIndex(blocks 인덱스) 변환 후
   * virtuosoRef.current.scrollToIndex(blockIndex) — tokenIndex(토큰 스트림 인덱스) 오사용 수정.
   */
  readonly onJumpReady?: (jumpFn: (anchor: string) => void) => void;
}

// AC8: 빈 rawText에도 <article> wrapper 존재
// className="md-content" — CSS 변수·타이포 토큰 스코프 (사이클 4, 설계 제약: prop 변경 없음)
// 사이클 9: virtualize=true 시 Block 배열을 VirtualizedArticle에 위임
export function MarkdownRenderer({ document, articleRef, virtualize = false, virtuosoRef, onJumpReady }: MarkdownRendererProps): JSX.Element {
  const tokens = getCachedTokens(document);
  const blocks = tokenStreamToBlocks(tokens, document.outline);
  const internalRef = useRef<HTMLElement>(null);
  const resolvedRef: Ref<HTMLElement> = articleRef ?? internalRef;

  if (virtualize) {
    // CR9.2-2: anchor→blockIndex 맵 구성.
    // tokenIndex(토큰 스트림 인덱스)가 아닌 blocks 배열 인덱스를 Virtuoso에 전달해야 올바른 위치로 이동.
    const anchorBlockMap = new Map<string, number>();
    blocks.forEach((b, i) => {
      if (b.kind === 'heading' && b.anchor !== undefined && b.anchor !== '') {
        anchorBlockMap.set(b.anchor, i);
      }
    });

    // jump 함수: scrollToAnchor 1차 시도 → 실패 시 blockIndex로 scrollToIndex 폴백 → RAF 재시도
    const jumpFn = (anchor: string): void => {
      const articleEl = typeof resolvedRef === 'object' && resolvedRef !== null
        ? (resolvedRef as React.RefObject<HTMLElement | null>).current
        : null;

      if (articleEl) {
        const found = scrollToAnchor(anchor, articleEl);
        if (found) return;
      }

      // scrollToAnchor 실패 (가상화로 미마운트) → blockIndex로 scrollToIndex 폴백
      const blockIdx = anchorBlockMap.get(anchor);
      if (blockIdx !== undefined) {
        virtuosoRef?.current?.scrollToIndex(blockIdx);
      }

      // RAF 다음 프레임: Virtuoso가 항목을 마운트한 후 anchor 재시도
      if (articleEl) {
        requestAnimationFrame(() => {
          scrollToAnchor(anchor, articleEl);
        });
      }
    };

    // onJumpReady 콜백으로 jump 함수를 App.tsx에 등록 (매 렌더마다 최신 anchorBlockMap 반영)
    onJumpReady?.(jumpFn);

    return (
      <VirtualizedArticle
        data={blocks}
        renderItem={(block) => block.element}
        articleRef={resolvedRef}
        virtuosoRef={virtuosoRef}
      />
    );
  }

  // 기본: 직접 렌더 (기존 동작 유지)
  // .md-content__item로 각 블록을 감싸 max-width 680px 중앙 정렬을 보장한다 (가상화 경로와 동일).
  return (
    <article ref={resolvedRef} className="md-content">
      {blocks.map((b) => (
        <div key={b.key} className="md-content__item">{b.element}</div>
      ))}
    </article>
  );
}
