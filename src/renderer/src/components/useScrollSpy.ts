// useScrollSpy — IntersectionObserver로 viewport 진입 헤딩 추적
// 동시 노출 시 boundingClientRect.top이 가장 작은(상단에 가까운) 헤딩 anchor 반환
// 사이클 10:
//   P8-5: TOC 클릭 직후 200ms scroll-spy 일시 정지 (깜빡임 방지)
//         또는 target anchor IO hit 시 조기 해제 (양방향 가드)
//   CR9-S2: useCallback ref + cleanup 패턴 리팩터링
// CR10-5: suspendUntil/pendingTarget useState → useRef 교체
//         Observer 콜백이 stale closure를 직접 읽어 불필요한 disconnect/reconnect 제거
import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import type { Heading } from '@shared/markdown/heading';

/** TOC 클릭 후 scroll-spy를 일시 정지하는 기간 (ms) */
const SCROLL_SPY_SUSPEND_MS = 200;

export interface UseScrollSpyReturn {
  activeAnchor: string | null;
  /** TOC 클릭 시 호출 — scroll-spy를 200ms 일시 정지 */
  suspendScrollSpy: (targetAnchor: string) => void;
}

export function useScrollSpy(
  headings: readonly Heading[],
  articleRef: RefObject<Element | null>,
): UseScrollSpyReturn {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  // CR10-5: useState → useRef — 상태 변경 시 Observer가 disconnect/reconnect되는 문제 해결.
  // 콜백에서 ref.current를 직접 읽으므로 deps에 포함할 필요 없음.
  const suspendUntilRef = useRef<number>(0);
  const pendingTargetRef = useRef<string | null>(null);

  /**
   * TOC 클릭 핸들러에서 호출 — 200ms 일시 정지 설정.
   * target anchor IO hit 발생 시 조기 해제 (양방향 가드).
   */
  const suspendScrollSpy = useCallback((targetAnchor: string) => {
    suspendUntilRef.current = Date.now() + SCROLL_SPY_SUSPEND_MS;
    pendingTargetRef.current = targetAnchor;
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || headings.length === 0) return;

    const visibleEntries = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;

          // P8-5 조기 해제: pendingTarget anchor가 IO hit이면 즉시 정지 해제
          if (entry.isIntersecting && id === pendingTargetRef.current) {
            suspendUntilRef.current = 0;
            pendingTargetRef.current = null;
          }

          if (entry.isIntersecting) {
            visibleEntries.set(id, entry);
          } else {
            visibleEntries.delete(id);
          }
        }

        // P8-5: 정지 중이면 setActiveId 스킵
        if (Date.now() < suspendUntilRef.current) return;

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

    // CR9-S2: cleanup 명시
    return () => observer.disconnect();
  // CR10-5: suspendUntilRef/pendingTargetRef은 ref이므로 deps 불필요.
  // articleRef.current(CR10-12)도 deps에서 제거 — articleRef 자체만 추적.
  }, [headings, articleRef]);

  return { activeAnchor, suspendScrollSpy };
}
