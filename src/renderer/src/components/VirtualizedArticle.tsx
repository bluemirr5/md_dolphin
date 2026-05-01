// VirtualizedArticle — react-virtuoso 기반 top-level 블록 가상화
// AC2: data(Block 배열)→virtuoso data 매핑, components.Scroller로 <article ref> 위임
// anchor 점프 시 미마운트 노드는 VirtuosoHandle.scrollToIndex(idx) 폴백
// rangeChanged 이벤트로 코드블록 mount/unmount 카운트 노출 (dev 측정용)
import {
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  forwardRef,
  type ForwardedRef,
  useMemo,
} from 'react';
import { Virtuoso, type VirtuosoHandle, type ScrollerProps } from 'react-virtuoso';

export interface VirtuosoScrollHandle {
  scrollToIndex: (index: number) => void;
}

interface VirtualizedArticleProps<T> {
  readonly data: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly articleRef: Ref<HTMLElement>;
  /** dev 측정용: 가상화 visible range 변경 콜백 */
  readonly onRangeChanged?: (range: { startIndex: number; endIndex: number }) => void;
  /** anchor 점프 폴백용: VirtuosoHandle을 외부에 노출 */
  readonly virtuosoRef?: RefObject<VirtuosoScrollHandle | null> | undefined;
}

// Scroller 팩토리 — articleRef closure를 주입받아 forwardRef 컴포넌트를 생성한다.
// useCallback 경고 우회: forwardRef를 직접 useMemo 안에서 생성
function makeScroller(articleRef: Ref<HTMLElement>) {
  return forwardRef<HTMLDivElement, ScrollerProps>(
    function ArticleScroller(
      props: ScrollerProps,
      virtuosoInternalRef: ForwardedRef<HTMLDivElement>,
    ) {
      function mergeRefs(el: HTMLDivElement | null): void {
        // virtuoso 내부 ref 연결
        if (typeof virtuosoInternalRef === 'function') {
          virtuosoInternalRef(el);
        } else if (virtuosoInternalRef) {
          virtuosoInternalRef.current = el;
        }
        // 외부 articleRef 연결 (HTMLElement 상위 타입으로 호환)
        if (typeof articleRef === 'function') {
          articleRef(el);
        } else if (articleRef) {
          (articleRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }
      }

      // react-virtuoso가 부여하는 onScroll·data-virtuoso-scroller-element 등을 그대로 전달해야
      // 가상화 visible range 계산이 동작한다 (className만 article 토큰으로 덮어씀).
      return (
        <article {...props} ref={mergeRefs} className="md-content" />
      );
    },
  );
}

/**
 * Block 배열을 react-virtuoso Virtuoso로 가상화 렌더한다.
 *
 * - components.Scroller에 <article ref={articleRef} className="md-content"> 위임
 *   → useScrollSpy·scrollToAnchor 기존 인터페이스(articleRef 기반 querySelector) 보존
 * - anchor 점프 시 querySelector가 실패하면 virtuosoRef.current.scrollToIndex(idx) 폴백
 * - rangeChanged 이벤트로 코드블록 mount/unmount 카운트를 onRangeChanged 콜백으로 전달
 */
export function VirtualizedArticle<T>({
  data,
  renderItem,
  articleRef,
  onRangeChanged,
  virtuosoRef,
}: VirtualizedArticleProps<T>): JSX.Element {
  const handleRangeChanged = useCallback(
    (range: { startIndex: number; endIndex: number }) => {
      onRangeChanged?.(range);
    },
    [onRangeChanged],
  );

  // Scroller: articleRef가 변경될 때만 재생성 (ref는 stable하므로 사실상 1회)
  const Scroller = useMemo(() => makeScroller(articleRef), [articleRef]);

  // react-virtuoso 4.x는 빈 data로 mount 시 내부 dataset 접근에서 null 참조 발생.
  // 빈 문서(EMPTY_DOCUMENT) 상태에서는 plain article만 렌더하여 race 회피.
  if (data.length === 0) {
    return (
      <article ref={articleRef} className="md-content" tabIndex={-1} />
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef as RefObject<VirtuosoHandle>}
      data={data}
      itemContent={(index, item) => renderItem(item, index)}
      components={{ Scroller }}
      rangeChanged={handleRangeChanged}
    />
  );
}
