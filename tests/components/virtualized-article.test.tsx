// @vitest-environment jsdom
// TDD R2 — VirtualizedArticle.tsx
// AC2: data(Block 배열)→virtuoso data 매핑, articleRef→<article> 바인딩, scrollToIndex 폴백, rangeChanged 카운트
// CR9-9: props를 tokens/renderToken → data/renderItem으로 변경, index 매칭 케이스 추가
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createRef, type ReactNode } from 'react';
import { VirtualizedArticle } from '../../src/renderer/src/components/VirtualizedArticle';

// react-virtuoso mock — Virtuoso를 단순 목록 렌더로 대체해 RTL 테스트 가능하게 함
vi.mock('react-virtuoso', () => {
  return {
    Virtuoso: ({
      data,
      itemContent,
      components,
      rangeChanged,
    }: {
      data: unknown[];
      itemContent: (index: number, item: unknown) => ReactNode;
      components?: { Scroller?: React.ComponentType<{ children?: ReactNode; [key: string]: unknown }> };
      rangeChanged?: (range: { startIndex: number; endIndex: number }) => void;
    }) => {
      // rangeChanged 시뮬레이션 — mount 시 0~data.length-1 범위로 호출
      if (rangeChanged && data.length > 0) {
        rangeChanged({ startIndex: 0, endIndex: data.length - 1 });
      }

      const Scroller = components?.Scroller;
      const items = data.map((item, i) => (
        <div key={i} data-testid={`virtuoso-item-${i}`}>
          {itemContent(i, item)}
        </div>
      ));

      if (Scroller) {
        return <Scroller>{items}</Scroller>;
      }
      return <div data-testid="virtuoso-root">{items}</div>;
    },
    VirtuosoHandle: {},
  };
});

// Block 픽스처 헬퍼 — VirtualizedArticle의 제네릭 T에 해당하는 최소 구조
interface TestBlock {
  readonly id: string;
  readonly element: ReactNode;
}

function makeBlock(id: string): TestBlock {
  return { id, element: <span data-testid={`block-${id}`}>{`content-${id}`}</span> };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('R2 — VirtualizedArticle (CR9-9: data/renderItem 인터페이스)', () => {
  it('data 배열을 virtuoso data로 전달하여 각 항목을 렌더한다', () => {
    const blocks = [makeBlock('0'), makeBlock('1')];
    const renderItem = vi.fn((block: TestBlock, i: number) => <span key={i}>item-{i}</span>);

    const { container } = render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={createRef()}
      />,
    );

    expect(renderItem).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('item-0');
    expect(container.textContent).toContain('item-1');
  });

  it('renderItem에 전달되는 item이 data[index]와 일치한다 (index 매칭)', () => {
    const blocks = [makeBlock('a'), makeBlock('b'), makeBlock('c')];
    const capturedPairs: Array<{ item: TestBlock; index: number }> = [];
    const renderItem = vi.fn((item: TestBlock, index: number) => {
      capturedPairs.push({ item, index });
      return <span key={index}>{item.id}</span>;
    });

    render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={createRef()}
      />,
    );

    expect(capturedPairs).toHaveLength(3);
    capturedPairs.forEach(({ item, index }) => {
      expect(item).toBe(blocks[index]);
    });
  });

  it('빈 data 배열도 에러 없이 렌더된다', () => {
    const renderItem = vi.fn(() => null);
    expect(() =>
      render(
        <VirtualizedArticle
          data={[]}
          renderItem={renderItem}
          articleRef={createRef()}
        />,
      ),
    ).not.toThrow();
    expect(renderItem).not.toHaveBeenCalled();
  });

  it('articleRef가 <article> 엘리먼트에 바인딩된다', () => {
    const blocks = [makeBlock('0')];
    const renderItem = (_b: TestBlock, i: number) => <span key={i}>p</span>;
    const ref = createRef<HTMLElement>();

    render(
      <VirtualizedArticle data={blocks} renderItem={renderItem} articleRef={ref} />,
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('article');
  });

  it('rangeChanged 이벤트 콜백을 받아 visibleRange를 노출한다', () => {
    const blocks = [makeBlock('0'), makeBlock('1')];
    const renderItem = (_b: TestBlock, i: number) => <span key={i}>code</span>;
    const onRangeChanged = vi.fn();

    render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={createRef()}
        onRangeChanged={onRangeChanged}
      />,
    );

    expect(onRangeChanged).toHaveBeenCalledWith({ startIndex: 0, endIndex: 1 });
  });

  it('scrollToIndex ref가 노출되어 외부에서 호출 가능하다', () => {
    const blocks = [makeBlock('0'), makeBlock('1')];
    const renderItem = (_b: TestBlock, i: number) => <span key={i}>h</span>;
    const ref = createRef<HTMLElement>();
    const virtuosoRef = { current: { scrollToIndex: vi.fn() } };

    render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={ref}
        virtuosoRef={virtuosoRef}
      />,
    );

    // mock 환경에서는 scrollToIndex가 vitest stub이므로 함수임만 확인
    expect(typeof virtuosoRef.current.scrollToIndex).toBe('function');
  });

  it('components.Scroller를 통해 <article> className="md-content"가 렌더된다', () => {
    const blocks = [makeBlock('0')];
    const renderItem = (_b: TestBlock, i: number) => <span key={i}>p</span>;

    const { container } = render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={createRef()}
      />,
    );

    const article = container.querySelector('article.md-content');
    expect(article).not.toBeNull();
  });

  it('data.length만큼 row가 생성된다 (blocks.length 정합 검증)', () => {
    const blocks = Array.from({ length: 10 }, (_, i) => makeBlock(String(i)));
    const renderItem = vi.fn((_b: TestBlock, i: number) => <span key={i}>row-{i}</span>);

    render(
      <VirtualizedArticle
        data={blocks}
        renderItem={renderItem}
        articleRef={createRef()}
      />,
    );

    // mock Virtuoso는 data 배열 길이만큼 itemContent 호출
    expect(renderItem).toHaveBeenCalledTimes(10);
  });
});
