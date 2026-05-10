// wide-mode-store — 본문 폭 와이드 모드 토글
// sidebar-store와 동일 패턴: 모듈 최상위 싱글턴 + localStorage 영속화.
// wide=true → .md-content__item의 max-width 제약 해제 (typography.css의 .is-wide 선택자가 처리).
import { create } from 'zustand';

const STORAGE_KEY = 'mddolphin.wide.enabled';

function readInitialEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    const parsed: unknown = JSON.parse(stored);
    return parsed === true || parsed === false ? parsed : true;
  } catch (e) {
    console.warn('[wide-mode-store] localStorage 읽기 실패, 기본값 true 사용', e);
    return true;
  }
}

function persistEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (e) {
    console.warn('[wide-mode-store] localStorage 쓰기 실패', e);
  }
}

interface WideModeState {
  readonly enabled: boolean;
  readonly toggle: () => void;
  readonly setEnabled: (v: boolean) => void;
}

const wideModeStore = create<WideModeState>((set) => ({
  enabled: readInitialEnabled(),
  toggle: () =>
    set((state) => {
      const next = !state.enabled;
      persistEnabled(next);
      return { enabled: next };
    }),
  setEnabled: (v: boolean) => {
    persistEnabled(v);
    set({ enabled: v });
  },
}));

export function useWideModeEnabled(): boolean {
  return wideModeStore((s) => s.enabled);
}

export function useWideModeToggle(): () => void {
  return wideModeStore((s) => s.toggle);
}

export { wideModeStore };
