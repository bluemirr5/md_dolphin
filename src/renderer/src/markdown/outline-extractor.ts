import type Token from 'markdown-it/lib/token.mjs';
import type { Heading, HeadingLevel, Outline, OutlineNode } from '@shared/markdown/heading';

// rawText에서 각 라인 시작의 문자 인덱스 배열을 계산한다.
// lineOffsets[n] = rawText에서 n번째 라인(0-indexed)이 시작하는 문자 인덱스
function buildLineOffsets(rawText: string): readonly number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < rawText.length; i++) {
    if (rawText[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

// 인라인 토큰에서 평탄화된 텍스트를 추출한다. 마크업(링크, 강조 등) 제거.
function flattenInlineTokens(tokens: readonly Token[]): string {
  return tokens
    .filter((t) => t.type === 'text' || t.type === 'code_inline' || t.type === 'softbreak')
    .map((t) => (t.type === 'softbreak' ? ' ' : t.content))
    .join('');
}

// GitHub-flavored slug 알고리즘:
// lowercase + 공백→'-' + ASCII alphanumeric/한글 보존, 그 외 strip
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\wㄱ-ㆎ가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// 중복 anchor 방지를 위한 suffix 카운터 적용.
// 이모지·특수문자만 있는 헤딩처럼 slugify 결과가 빈 문자열이 될 때는 'section'을 base로 사용한다.
function resolveAnchor(text: string, usedAnchors: Map<string, number>): string {
  const raw = slugify(text);
  const base = raw.length > 0 ? raw : 'section';
  const count = usedAnchors.get(base) ?? 0;
  usedAnchors.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

// markdown-it 토큰 스트림에서 헤딩 목록을 추출한다.
function extractHeadings(
  tokens: readonly Token[],
  lineOffsets: readonly number[],
  usedAnchors: Map<string, number>,
): readonly Heading[] {
  const headings: Heading[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.type !== 'heading_open') continue;

    const level = parseInt(token.tag.slice(1), 10) as HeadingLevel;
    const lineIndex = token.map?.[0] ?? 0;
    const offset = lineOffsets[lineIndex] ?? 0;

    const inlineToken = tokens[i + 1];
    const rawInlineChildren: Token[] =
      inlineToken?.type === 'inline' ? (inlineToken.children ?? []) : [];
    const text = flattenInlineTokens(rawInlineChildren);
    const anchor = resolveAnchor(text, usedAnchors);

    // tokenIndex: heading_open 토큰의 스트림 내 인덱스 — VirtualizedArticle.scrollToIndex 폴백용 (P9-5)
    headings.push({ level, text, anchor, offset, tokenIndex: i });
  }

  return headings;
}

// Outline 트리 구성 — 형제·점프(H1→H3) 처리
function buildOutline(headings: readonly Heading[]): Outline {
  type WorkNode = { level: HeadingLevel; heading: Heading; childList: WorkNode[] };

  const stack: WorkNode[] = [];
  const rootList: WorkNode[] = [];

  for (const heading of headings) {
    const workNode: WorkNode = { level: heading.level, heading, childList: [] };

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootList.push(workNode);
    } else {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.childList.push(workNode);
      }
    }

    stack.push(workNode);
  }

  function toOutlineNode(w: WorkNode): OutlineNode {
    return { heading: w.heading, children: w.childList.map(toOutlineNode) };
  }

  return { root: rootList.map(toOutlineNode) };
}

/**
 * rawText와 markdown-it 토큰 스트림에서 headings 배열과 outline 트리를 추출한다.
 * adapter.ts의 parseMarkdown이 위임하는 단일 진입점.
 * H5/H6는 headings 배열과 outline 트리 모두에 보존된다 (SidebarView에서 필터).
 */
export function extractOutline(
  rawText: string,
  tokens: readonly Token[],
): { headings: readonly Heading[]; outline: Outline } {
  const lineOffsets = buildLineOffsets(rawText);
  const usedAnchors = new Map<string, number>();
  const headings = extractHeadings(tokens, lineOffsets, usedAnchors);
  const outline = buildOutline(headings);
  return { headings, outline };
}
