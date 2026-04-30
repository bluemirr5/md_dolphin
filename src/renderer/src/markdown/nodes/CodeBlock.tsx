import { useState, useEffect } from 'react';
import { highlightCode } from '../shiki';
import { sanitizeShikiHtml } from '../sanitize';

// AC9: props는 사이클 2 인터페이스 동결 — 내부 상태만 추가 (설계 제약)
interface CodeBlockProps {
  readonly code: string;
  readonly language: string | undefined;
}

export function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  // shiki 하이라이팅 결과 — null이면 plain fallback (AC5: FOUC 없음)
  const [shikiHtml, setShikiHtml] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<string>('복사');

  useEffect(() => {
    // mount 플래그 — 비동기 완료 전 unmount 시 setState 방지
    let mounted = true;

    void highlightCode(code, language).then((html) => {
      if (mounted) {
        // P2-2: shiki 출력 sanitize — dangerouslySetInnerHTML 직전 1회 적용
        setShikiHtml(html !== null ? sanitizeShikiHtml(html) : null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [code, language]);

  function handleCopy(): void {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopyLabel('복사됨!');
        setTimeout(() => setCopyLabel('복사'), 1500);
      },
      (err: unknown) => {
        console.warn('[CodeBlock] 클립보드 복사 실패:', err);
      },
    );
  }

  return (
    <div className="codeblock">
      {language !== undefined && (
        <span className="codeblock__lang">{language}</span>
      )}
      <button
        className="codeblock__copy"
        aria-label="코드 복사"
        onClick={handleCopy}
      >
        {copyLabel}
      </button>
      {shikiHtml !== null ? (
        // shiki 출력은 <span style="color:..."> 트리 — 외부 입력 미혼입 (설계 제약)
        // html:false + shiki 토큰화 결과만이므로 innerHTML 주입 안전
        <div dangerouslySetInnerHTML={{ __html: shikiHtml }} />
      ) : (
        <pre>
          <code className={language !== undefined ? `language-${language}` : undefined}>
            {code}
          </code>
        </pre>
      )}
    </div>
  );
}
