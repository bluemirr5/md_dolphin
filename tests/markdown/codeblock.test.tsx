import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { CodeBlock } from '../../src/renderer/src/markdown/nodes/CodeBlock';

// shiki 모듈을 mock하여 RTL 테스트에서 비동기 흐름 제어
vi.mock('../../src/renderer/src/markdown/shiki-loader', () => ({
  highlightCode: vi.fn(),
}));

describe('사후 — CodeBlock 시각·복사 버튼·shiki 비동기 주입', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // 각 테스트 후 DOM 정리
    vi.restoreAllMocks();
  });

  it('AC4-a: 언어 라벨이 우상단에 표시됨', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    render(<CodeBlock code="const x = 1" language="typescript" />);

    expect(screen.getByText('typescript')).not.toBeNull();
  });

  it('AC4-b: 언어 미지정이면 라벨 없음', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    render(<CodeBlock code="plain code" language={undefined} />);

    // language undefined이면 언어 라벨 span이 렌더링되지 않음
    const langLabels = document.querySelectorAll('.codeblock__lang');
    expect(langLabels.length).toBe(0);
  });

  it('AC4-c: 복사 버튼 aria-label="코드 복사" 존재', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    render(<CodeBlock code="const x = 1" language="typescript" />);

    const btn = screen.getByRole('button', { name: '코드 복사' });
    expect(btn).not.toBeNull();
  });

  it('AC4-d: 복사 버튼 Tab 포커스 가능 (tabIndex 기본값)', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    render(<CodeBlock code="const x = 1" language="typescript" />);

    const btn = screen.getByRole('button', { name: '코드 복사' });
    // tabIndex가 없거나 0이면 Tab 포커스 가능
    const tabIndex = btn.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });

  it('AC4-e: 복사 버튼 클릭 시 navigator.clipboard.writeText 호출', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CodeBlock code="복사할코드" language="typescript" />);

    const btn = screen.getByRole('button', { name: '코드 복사' });
    act(() => {
      btn.click();
    });

    // writeText는 비동기이므로 microtask 완료 대기
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('복사할코드');
    });
  });

  it('AC5-a: shiki resolve 전 plain <pre><code> 표시 (FOUC 없음)', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    // Promise를 resolve하지 않아 shiki 미적용 상태 시뮬레이션
    vi.mocked(highlightCode).mockReturnValue(new Promise(() => {}));

    const { container } = render(<CodeBlock code="const x = 1" language="typescript" />);

    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    const code = pre?.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('const x = 1');
  });

  it('AC5-b: shiki HTML 반환 후 dangerouslySetInnerHTML로 교체', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    const fakeHtml = '<pre class="shiki"><code><span>const x = 1</span></code></pre>';
    vi.mocked(highlightCode).mockResolvedValue(fakeHtml);

    const { container } = render(<CodeBlock code="const x = 1" language="typescript" />);

    // shiki 비동기 resolve 대기
    await act(async () => {
      await Promise.resolve();
    });

    // shiki HTML 주입 후 .shiki 클래스 존재
    expect(container.querySelector('.shiki')).not.toBeNull();
  });

  it('AC5-c: 언어 미지정이면 shiki 미적용 — plain 유지', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    const { container } = render(<CodeBlock code="plain code" language={undefined} />);

    await act(async () => {
      await Promise.resolve();
    });

    // language undefined → shiki null → plain pre>code 유지
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.querySelector('code')?.textContent).toBe('plain code');
  });

  it('AC9: codeblock wrapper div 존재', async () => {
    const { highlightCode } = await import('../../src/renderer/src/markdown/shiki-loader');
    vi.mocked(highlightCode).mockResolvedValue(null);

    const { container } = render(<CodeBlock code="code" language="javascript" />);

    expect(container.querySelector('.codeblock')).not.toBeNull();
  });
});
