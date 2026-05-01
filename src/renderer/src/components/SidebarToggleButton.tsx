// SidebarToggleButton — 사이드바 표시/숨기기 토글 버튼
// aria-pressed: visible 상태와 동기화
// ⌘1 단축키와 동일 동작 (App.tsx keydown handler가 동일 toggle 호출)
import { useSidebarVisible, useSidebarToggle } from '../store/sidebar-store';

export function SidebarToggleButton(): JSX.Element {
  const visible = useSidebarVisible();
  const toggle = useSidebarToggle();

  return (
    <button
      type="button"
      className="md-sidebar-toggle"
      aria-pressed={visible}
      aria-label="목차 표시/숨기기"
      onClick={toggle}
    >
      ☰
    </button>
  );
}
