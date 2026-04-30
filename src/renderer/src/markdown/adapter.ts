import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { Options as MarkdownItOptions, PluginWithOptions } from 'markdown-it';
import _taskListsPlugin from 'markdown-it-task-lists';
import type { MarkdownDocument } from '@shared/markdown/document';
import type { Heading, HeadingLevel, Outline, OutlineNode } from '@shared/markdown/heading';

// markdown-it-task-lists에는 @types 패키지가 없음.
// declare module 선언만으로는 typescript-eslint가 plugin 시그니처를 추론하지 못해
// PluginWithOptions<TaskListOptions>로 캐스팅 (타입 정보 손실 최소)
interface TaskListOptions {
  enabled: boolean;
  label: boolean;
}
const markdownItTaskLists = _taskListsPlugin as unknown as PluginWithOptions<TaskListOptions>;

// markdown-it 파싱 옵션 — 사이클 7 DOMPurify 없이 allowlist 확장 불가하므로 고정
// linkify: true는 사이클 5에서 추가 (bare URL autolink 지원)
// html: false — P2-8 의무 동결, typographer: false 유지 (사이클 9~10)
const MD_OPTIONS: MarkdownItOptions = {
  html: false,
  linkify: true,
  typographer: false,
};

export interface ParseOptions {
  readonly baseUrl?: string;
}

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

// GitHub-flavored slug 알고리즘 (사이클 2 잠정):
// lowercase + 공백→'-' + ASCII alphanumeric/한글 보존, 그 외 strip
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\wㄱ-ㆎ가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// 중복 anchor 방지를 위한 suffix 카운터 적용
function resolveAnchor(text: string, usedAnchors: Map<string, number>): string {
  const base = slugify(text);
  const count = usedAnchors.get(base) ?? 0;
  usedAnchors.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

// markdown-it 토큰 스트림에서 헤딩 목록을 추출한다.
// AC3: heading.offset === rawText.indexOf('# 헤딩텍스트') — lineOffsets 변환 결과
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
    // token.map[0]: 헤딩이 시작하는 라인 번호(0-indexed) → lineOffsets로 문자 인덱스 변환
    const lineIndex = token.map?.[0] ?? 0;
    const offset = lineOffsets[lineIndex] ?? 0;

    // heading_open 다음 토큰이 inline 토큰
    const inlineToken = tokens[i + 1];
    const rawInlineChildren: Token[] =
      inlineToken?.type === 'inline' ? (inlineToken.children ?? []) : [];
    const text = flattenInlineTokens(rawInlineChildren);
    const anchor = resolveAnchor(text, usedAnchors);

    headings.push({ level, text, anchor, offset });
  }

  return headings;
}

// Outline 트리 구성 — buildOutline은 내부 전용 (AC4)
// 형제·점프(H1→H3) 처리
// 내부에서만 mutable children 배열을 관리하고, 최종 반환 시 OutlineNode로 변환
function buildOutline(headings: readonly Heading[]): Outline {
  // 트리 빌드용 내부 구조: children은 mutable
  type WorkNode = { level: HeadingLevel; heading: Heading; childList: WorkNode[] };

  const stack: WorkNode[] = [];
  const rootList: WorkNode[] = [];

  for (const heading of headings) {
    const workNode: WorkNode = { level: heading.level, heading, childList: [] };

    // stack에서 현재 level 이상인 항목을 pop
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

  // WorkNode → OutlineNode 변환 (재귀적으로 children을 readonly로 변환)
  function toOutlineNode(w: WorkNode): OutlineNode {
    return { heading: w.heading, children: w.childList.map(toOutlineNode) };
  }

  return { root: rootList.map(toOutlineNode) };
}

// 모듈 스코프 토큰 캐시 — WeakMap으로 MarkdownDocument 수명에 연동
// MarkdownDocument 타입 무변경 원칙 (P6-1, 마스터 플랜 4.2/4.6)
const tokenCache = new WeakMap<MarkdownDocument, readonly Token[]>();

// markdown-it 인스턴스 생성 헬퍼 — adapter.ts 내부 재사용
function createMarkdownIt(): MarkdownIt {
  return new MarkdownIt(MD_OPTIONS).use(markdownItTaskLists, { enabled: false, label: false });
}

// 외부 공개 API — parseMarkdown만.
// renderTokensToReact는 내부 전용 (markdown-it 락인 제거 원칙).
export function parseMarkdown(
  rawText: string,
  url: string | undefined,
  _opts?: ParseOptions,
): MarkdownDocument {
  if (rawText.trim() === '') {
    const emptyDoc: MarkdownDocument = {
      url,
      rawText,
      headings: [],
      outline: { root: [] },
    };
    tokenCache.set(emptyDoc, []);
    return emptyDoc;
  }

  // 호출 단위로 인스턴스 생성 — 모듈 싱글턴 금지 (사이클 5 GFM .use() 전역 오염 방지)
  // enabled:false → input disabled (편집 차단), label:false → label 래핑 비활성
  const md = createMarkdownIt();
  const tokens = md.parse(rawText, {});

  const lineOffsets = buildLineOffsets(rawText);
  const usedAnchors = new Map<string, number>();
  const headings = extractHeadings(tokens, lineOffsets, usedAnchors);
  const outline = buildOutline(headings);

  const result: MarkdownDocument = { url, rawText, headings, outline };
  tokenCache.set(result, tokens);
  return result;
}

/**
 * MarkdownDocument에 연결된 토큰 배열 반환.
 * - parseMarkdown으로 생성된 doc: 캐시된 토큰 즉시 반환
 * - 직접 생성된 doc (캐시 miss): rawText를 1회 파싱하여 반환 + 캐시 저장
 * - rawText가 빈 문자열: 빈 배열 반환
 */
export function getCachedTokens(doc: MarkdownDocument): readonly Token[] {
  const cached = tokenCache.get(doc);
  if (cached !== undefined) return cached;

  // 캐시 miss — fallback 파싱
  if (doc.rawText.trim() === '') {
    tokenCache.set(doc, []);
    return [];
  }

  const tokens = createMarkdownIt().parse(doc.rawText, {});
  tokenCache.set(doc, tokens);
  return tokens;
}
