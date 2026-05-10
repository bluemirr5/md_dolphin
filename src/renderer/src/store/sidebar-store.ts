// sidebar-store — 모듈 최상위 싱글턴 (P8-1 옵션 A)
// 사이드바 visible 상태를 앱 전역 사용자 설정으로 관리한다 (마스터 플랜 4.5 AppSettings).
// document-store의 윈도우별 factory 패턴과 달리 단일 인스턴스가 전체 앱에 공유된다.
import { create } from 'zustand';

const STORAGE_KEY = 'mddolphin.sidebar.visible';

function readInitialVisible(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    const parsed: unknown = JSON.parse(stored);
    return parsed === true || parsed === false ? parsed : true;
  } catch (e) {
    console.warn('[sidebar-store] localStorage 읽기 실패, 기본값 true 사용', e);
    return true;
  }
}

function persistVisible(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (e) {
    console.warn('[sidebar-store] localStorage 쓰기 실패', e);
  }
}

interface SidebarState {
  readonly visible: boolean;
  readonly toggle: () => void;
  readonly setVisible: (v: boolean) => void;
}

const sidebarStore = create<SidebarState>((set) => ({
  visible: readInitialVisible(),
  toggle: () =>
    set((state) => {
      const next = !state.visible;
      persistVisible(next);
      return { visible: next };
    }),
  setVisible: (v: boolean) => {
    persistVisible(v);
    set({ visible: v });
  },
}));

export function useSidebarVisible(): boolean {
  return sidebarStore((s) => s.visible);
}

export function useSidebarToggle(): () => void {
  return sidebarStore((s) => s.toggle);
}

export { sidebarStore };
