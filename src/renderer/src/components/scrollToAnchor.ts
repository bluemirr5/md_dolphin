// scrollToAnchor — 헤딩 anchor로 부드러운 스크롤 이동
// prefers-reduced-motion: reduce 시 behavior: 'auto' 폴백
// CR9-6: 대상 엘리먼트 발견 여부를 boolean으로 반환 — 미발견 시 가상화 폴백 트리거에 사용

export function scrollToAnchor(anchor: string, articleEl: Element): boolean {
  const target = articleEl.querySelector(`[id="${CSS.escape(anchor)}"]`);
  if (!target) {
    console.warn(`[scrollToAnchor] anchor not found: ${anchor}`);
    return false;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
  return true;
}
