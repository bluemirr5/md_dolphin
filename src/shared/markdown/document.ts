import type { Heading, Outline } from './heading';

// 마크다운 문서 도메인 모델.
// url: string | undefined — exactOptionalPropertyTypes 전제, optional 필드(url?: string) 아님.
// 사이클 3 FileService 도입 전까지 인라인 데모는 url=undefined로 표현.
export interface MarkdownDocument {
  readonly url: string | undefined;
  readonly rawText: string;
  readonly outline: Outline;
  readonly headings: readonly Heading[];
}
