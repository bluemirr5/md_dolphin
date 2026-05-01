// scrollToAnchor — 헤딩 anchor로 부드러운 스크롤 이동
// prefers-reduced-motion: reduce 시 behavior: 'auto' 폴백

export function scrollToAnchor(anchor: string, articleEl: Element): void {
  const target = articleEl.querySelector(`[id="${CSS.escape(anchor)}"]`);
  if (!target) {
    console.warn(`[scrollToAnchor] anchor not found: ${anchor}`);
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
