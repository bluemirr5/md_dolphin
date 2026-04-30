import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { parseMarkdown } from './markdown/adapter';

// 사이클 2 인라인 데모 rawText (import.meta.glob 금지 — 번들 fixture 누설 방지)
// 사이클 3 FileService IPC 도입 시 실제 파일 로드로 교체됨.
const DEMO_RAW_TEXT = `\
# md_dolphin

macOS용 마크다운 뷰어입니다.

## 주요 기능

- **마크다운 렌더링**: GitHub Flavored Markdown 지원 예정
- **빠른 파싱**: markdown-it 기반 고성능 파서
- **보안**: CSP 헤더 + sandbox 환경

## 코드 예시

\`\`\`typescript
import { parseMarkdown } from './markdown/adapter';

const doc = parseMarkdown('# Hello', undefined);
console.log(doc.headings[0]?.text); // "Hello"
\`\`\`

## 링크

공식 문서는 [마크다운 가이드](https://www.markdownguide.org)를 참고하세요.

### H3 소제목

인라인 \`코드\`와 **굵은 글씨**, *기울임* 텍스트를 지원합니다.

#### H4 더 작은 제목

사이클 3에서 파일 열기(⌘O), drag & drop 기능이 추가될 예정입니다.
`;

const DEMO_DOCUMENT = parseMarkdown(DEMO_RAW_TEXT, undefined);

function App(): JSX.Element {
  return (
    <main
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily:
          '-apple-system, "SF Pro Text", system-ui, "Apple SD Gothic Neo", sans-serif',
        color: '#1C1C1E',
        background: '#FAFAF7',
        minHeight: '100vh',
      }}
    >
      <MarkdownRenderer document={DEMO_DOCUMENT} />
    </main>
  );
}

export default App;
