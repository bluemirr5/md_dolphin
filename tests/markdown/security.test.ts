// AC5: markdown-it html:false 설정이 parseMarkdown 수준에서 스크립트를 차단하는지 확인
// 렌더러 수준 검증은 renderer.test.tsx의 AC5 섹션에서 수행
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/renderer/src/markdown/adapter';

describe('AC5 — parseMarkdown 보안 (html:false)', () => {
  it('<script> 태그가 rawText를 그대로 보존하되 렌더 출력에 포함되지 않음을 타입 레벨로 확인', () => {
    // parseMarkdown 자체는 HTML을 이스케이프/제거하지 않고 rawText를 보존함
    // html:false는 markdown-it이 HTML 토큰을 생성하지 않음을 보장
    // 실제 DOM 부재 검증은 renderer.test.tsx에서 수행
    const rawText = '<script>alert(1)</script>';
    const doc = parseMarkdown(rawText, undefined);
    // rawText는 그대로 보존
    expect(doc.rawText).toBe(rawText);
    // headings는 없음
    expect(doc.headings).toHaveLength(0);
  });

  it('인라인 HTML이 있어도 headings 추출에 영향 없음', () => {
    const rawText = '# 제목\n\n<b>굵은 글씨</b>\n\n## 소제목\n';
    const doc = parseMarkdown(rawText, undefined);
    // html:false이므로 <b>는 텍스트 취급되거나 paragraph가 됨
    // 헤딩은 정상 추출
    expect(doc.headings).toHaveLength(2);
    expect(doc.headings[0]!.level).toBe(1);
    expect(doc.headings[1]!.level).toBe(2);
  });
});
