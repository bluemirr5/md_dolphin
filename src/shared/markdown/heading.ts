// 헤딩 수준: HTML h1~h6에 대응
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// 단일 헤딩 메타데이터.
// offset: rawText에서 헤딩 시작 문자 인덱스 (lineOffsets 변환 결과, token.map[0] 라인 번호 아님)
// anchor: GitHub-flavored slug (lowercase + 공백→'-' + ASCII alphanumeric/한글 보존, 중복 시 -N suffix)
// tokenIndex: 토큰 스트림에서 heading_open 토큰의 인덱스 — VirtualizedArticle.scrollToIndex 폴백용 (P9-5)
export interface Heading {
  readonly level: HeadingLevel;
  readonly text: string;
  readonly anchor: string;
  readonly offset: number;
  readonly tokenIndex: number;
}

// 목차 트리 노드
export interface OutlineNode {
  readonly heading: Heading;
  readonly children: readonly OutlineNode[];
}

// 문서 전체 목차 (루트 레벨 노드 배열)
export interface Outline {
  readonly root: readonly OutlineNode[];
}
