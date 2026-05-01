// useScrollSpy — IntersectionObserver로 viewport 진입 헤딩 추적
// 동시 노출 시 boundingClientRect.top이 가장 작은(상단에 가까운) 헤딩 anchor 반환
import { useState, useEffect, type RefObject } from 'react';
import type { Heading } from '@shared/markdown/heading';

export function useScrollSpy(
  headings: readonly Heading[],
  articleRef: RefObject<Element | null>,
): string | null {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || headings.length === 0) return;

    const visibleEntries = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleEntries.set(id, entry);
          } else {
            visibleEntries.delete(id);
          }
        }

        if (visibleEntries.size === 0) return;

        // 동시 노출 시 상단에 가장 가까운 헤딩 선택
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of visibleEntries.values()) {
          if (
            topEntry === null ||
            entry.boundingClientRect.top < topEntry.boundingClientRect.top
          ) {
            topEntry = entry;
          }
        }

        if (topEntry) {
          setActiveAnchor(topEntry.target.id);
        }
      },
      { rootMargin: '0px 0px -70% 0px' },
    );

    for (const heading of headings) {
      const el = article.querySelector(`[id="${CSS.escape(heading.anchor)}"]`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  // CR8-7 흡수: articleRef.current를 deps에 명시 (eslint-plugin-react-hooks exhaustive-deps 준수)
  // articleRef 자체는 stable ref object이지만 .current 변경을 추적하기 위해 추가
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings, articleRef, articleRef.current]);

  return activeAnchor;
}
