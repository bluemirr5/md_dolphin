import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { Options as MarkdownItOptions, PluginWithOptions } from 'markdown-it';
import _taskListsPlugin from 'markdown-it-task-lists';
import type { MarkdownDocument } from '@shared/markdown/document';
import { extractOutline } from './outline-extractor';

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

  const { headings, outline } = extractOutline(rawText, tokens);

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
