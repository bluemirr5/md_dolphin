#!/usr/bin/env tsx
/**
 * tests/fixtures/large-10k.md 결정적 재생성 스크립트.
 *
 * 분포:
 *   헤딩 5%, 문단 70%, 인라인/링크 포함 15%, 코드블록 10%
 *   한국어:영문 = 6:4
 *
 * SHA256 결정성: 시드 고정 의사난수(Mulberry32)로 동일 입력 → 동일 출력 보장.
 * 스크립트 실행마다 SHA256이 동일해야 AC12 통과.
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_PATH = join(__dirname, 'large-10k.md');
const TARGET_LINES = 10_000;

// Mulberry32 의사난수 생성기 (시드 고정)
function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42); // 고정 시드

// 한국어 문장 풀
const KO_SENTENCES = [
  '마크다운은 가볍고 읽기 쉬운 텍스트 형식입니다.',
  '문서를 작성할 때 마크다운을 사용하면 편리합니다.',
  '헤딩과 문단을 조합하여 구조적인 문서를 만들 수 있습니다.',
  '링크와 이미지를 쉽게 삽입할 수 있습니다.',
  '코드 블록을 통해 소스 코드를 명확하게 표현합니다.',
  '목록과 인용문으로 정보를 체계적으로 정리합니다.',
  '테이블을 사용하면 데이터를 표 형식으로 나타낼 수 있습니다.',
  '굵은 글씨와 기울임으로 중요한 내용을 강조합니다.',
  '수평선으로 섹션을 구분할 수 있습니다.',
  '마크다운은 다양한 플랫폼에서 지원됩니다.',
  '개발자들이 문서화를 위해 많이 사용하는 형식입니다.',
  '간단한 문법으로 복잡한 문서 구조를 표현합니다.',
  '렌더링된 결과물이 보기 좋게 출력됩니다.',
  '버전 관리 시스템과 잘 통합됩니다.',
  '다양한 에디터에서 실시간 미리보기를 지원합니다.',
];

// 영문 문장 풀
const EN_SENTENCES = [
  'Markdown is a lightweight markup language for creating formatted text.',
  'It was designed to be readable in both source and rendered form.',
  'Headers are created by prefixing text with hash symbols.',
  'Bold text is created by wrapping with double asterisks.',
  'Italic text uses single asterisks or underscores.',
  'Code can be inline or in fenced blocks with syntax highlighting.',
  'Links are created with bracket and parenthesis notation.',
  'Images use similar syntax but with an exclamation mark prefix.',
  'Unordered lists use hyphens, asterisks, or plus signs.',
  'Ordered lists use numbers followed by periods.',
  'Blockquotes are prefixed with a greater-than sign.',
  'Horizontal rules separate sections with three or more dashes.',
  'Tables align columns with pipe characters and dashes.',
  'Task lists use brackets to indicate completion status.',
  'Footnotes provide additional information without cluttering the main text.',
];

// 한국어 헤딩 풀
const KO_HEADINGS = [
  '소개', '개요', '사용법', '특징', '예시', '설정', '참고',
  '결론', '요약', '주의사항', '설치', '실행', '디버깅', '배포',
  '테스트', '성능', '보안', '접근성', '국제화', '문서화',
];

// 영문 헤딩 풀
const EN_HEADINGS = [
  'Introduction', 'Overview', 'Usage', 'Features', 'Examples',
  'Configuration', 'Reference', 'Conclusion', 'Summary', 'Notes',
  'Installation', 'Running', 'Debugging', 'Deployment', 'Testing',
  'Performance', 'Security', 'Accessibility', 'Internationalization', 'Documentation',
];

// 코드 예시 풀
const CODE_EXAMPLES = [
  { lang: 'typescript', code: 'const greeting: string = "Hello, World!";\nconsole.log(greeting);' },
  { lang: 'javascript', code: 'function add(a, b) {\n  return a + b;\n}' },
  { lang: 'python', code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)' },
  { lang: 'bash', code: '#!/bin/bash\necho "Script started"\nnpm install\nnpm run build' },
  { lang: 'json', code: '{\n  "name": "example",\n  "version": "1.0.0"\n}' },
];

// 의사난수를 사용해 0..max-1 정수 반환
function randInt(max: number): number {
  return Math.floor(rand() * max);
}

// 의사난수를 사용해 배열에서 항목 선택
function pick<T>(arr: readonly T[]): T {
  const item = arr[randInt(arr.length)];
  if (item === undefined) throw new Error('Empty array');
  return item;
}

// 한국어/영문 중 비율에 따라 선택 (6:4)
function isKorean(): boolean {
  return rand() < 0.6;
}

type BlockType = 'heading' | 'paragraph' | 'inline' | 'code';

// 블록 타입을 분포에 따라 결정
// 헤딩 5%, 문단 70%, 인라인 15%, 코드블록 10%
function pickBlockType(): BlockType {
  const r = rand();
  if (r < 0.05) return 'heading';
  if (r < 0.75) return 'paragraph';
  if (r < 0.90) return 'inline';
  return 'code';
}

// 헤딩 블록 생성 (1줄)
function makeHeading(level: 1 | 2 | 3): string {
  const text = isKorean() ? pick(KO_HEADINGS) : pick(EN_HEADINGS);
  return `${'#'.repeat(level)} ${text}`;
}

// 문단 블록 생성 (1줄)
function makeParagraph(): string {
  const sentence = isKorean() ? pick(KO_SENTENCES) : pick(EN_SENTENCES);
  return sentence;
}

// 인라인 포함 문단 (1줄)
function makeInlineParagraph(): string {
  const code = isKorean() ? '`마크다운 파서`' : '`markdownParser`';
  const link = isKorean()
    ? '[마크다운 공식 사이트](https://daringfireball.net/projects/markdown/)'
    : '[Markdown Official](https://daringfireball.net/projects/markdown/)';
  const sentence = isKorean() ? pick(KO_SENTENCES) : pick(EN_SENTENCES);
  const variant = randInt(3);
  if (variant === 0) return `${sentence} 자세한 내용은 ${link}을 참고하세요.`;
  if (variant === 1) return `${code}를 사용하면 ${sentence}`;
  return `**${isKorean() ? '중요' : 'Important'}**: ${sentence}`;
}

// 코드블록 생성 (복수 줄)
function makeCodeBlock(): string {
  const example = pick(CODE_EXAMPLES);
  return `\`\`\`${example.lang}\n${example.code}\n\`\`\``;
}

// 10,000줄 콘텐츠 생성
function generateLines(): string[] {
  const lines: string[] = [];
  let currentHeadingLevel: 1 | 2 | 3 = 1;

  while (lines.length < TARGET_LINES) {
    const blockType = pickBlockType();

    if (blockType === 'heading') {
      if (lines.length > 0) lines.push('');
      const level = (randInt(3) + 1) as 1 | 2 | 3;
      currentHeadingLevel = level;
      lines.push(makeHeading(currentHeadingLevel));
      if (lines.length < TARGET_LINES) lines.push('');
    } else if (blockType === 'paragraph') {
      lines.push(makeParagraph());
      if (lines.length < TARGET_LINES) lines.push('');
    } else if (blockType === 'inline') {
      lines.push(makeInlineParagraph());
      if (lines.length < TARGET_LINES) lines.push('');
    } else {
      // 코드블록: 복수 줄
      const codeBlock = makeCodeBlock();
      const codeLines = codeBlock.split('\n');
      if (lines.length > 0) lines.push('');
      for (const cl of codeLines) {
        lines.push(cl);
        if (lines.length >= TARGET_LINES) break;
      }
      if (lines.length < TARGET_LINES) lines.push('');
    }
  }

  // 정확히 TARGET_LINES 줄로 맞춤
  return lines.slice(0, TARGET_LINES);
}

function main(): void {
  const lines = generateLines();

  // 마지막 줄이 정확히 TARGET_LINES번째이고 파일 끝에 개행 없음(wc -l 기준)
  const content = lines.join('\n');
  writeFileSync(OUTPUT_PATH, content, 'utf-8');

  const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
  const lineCount = lines.length;

  console.log(`Generated: ${OUTPUT_PATH}`);
  console.log(`Lines: ${lineCount}`);
  console.log(`SHA256: ${hash}`);

  if (lineCount !== TARGET_LINES) {
    console.error(`ERROR: expected ${TARGET_LINES} lines, got ${lineCount}`);
    process.exit(1);
  }
}

main();
