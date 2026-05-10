// theme-pack-store.ts — 활성 테마 팩 + 사용 가능 팩 목록 (사이클 12)
// zustand 모듈 싱글턴 패턴 (sidebar-store/wide-mode-store와 동일)
// localStorage 키: mddolphin.theme-pack.active
// P12-5: storage event listener 신규 등록 — 다른 BrowserWindow의 변경 동기화
import { create } from 'zustand';
import type { ThemePack } from '@shared/theme-spec';

const STORAGE_KEY = 'mddolphin.theme-pack.active';
const DEFAULT_ACTIVE_ID = 'builtin:default';

function readInitialActiveId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored : DEFAULT_ACTIVE_ID;
  } catch (e) {
    console.warn('[theme-pack-store] localStorage 읽기 실패, 기본값 사용', e);
    return DEFAULT_ACTIVE_ID;
  }
}

function persistActiveId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.warn('[theme-pack-store] localStorage 쓰기 실패', e);
  }
}

interface ThemePackState {
  readonly activeId: string;
  readonly available: readonly ThemePack[];
  readonly setActiveId: (id: string) => void;
  readonly setAvailable: (packs: readonly ThemePack[]) => void;
}

export const themePackStore = create<ThemePackState>((set, get) => ({
  activeId: readInitialActiveId(),
  available: [],

  setActiveId: (id: string) => {
    // 멱등: 동일 값 재호출 시 noop
    if (get().activeId === id) return;
    persistActiveId(id);
    set({ activeId: id });
  },

  setAvailable: (packs: readonly ThemePack[]) => {
    set({ available: packs });
  },
}));

// P12-5: storage event listener — 다른 BrowserWindow에서 activeId 변경 시 동기화
// storage event는 같은 origin 다른 탭/webContents에서 fire됨 (같은 탭은 fire 안 함)
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  if (event.storageArea !== localStorage) return;

  const newId = event.newValue ?? DEFAULT_ACTIVE_ID;
  const currentId = themePackStore.getState().activeId;

  if (currentId !== newId) {
    // storage event로 온 변경은 localStorage에 이미 반영됨 — 스토어만 갱신
    themePackStore.setState({ activeId: newId });
  }
}

// storage event 등록 (모듈 로드 시 1회)
window.addEventListener('storage', handleStorageEvent);

// 테스트 격리용 dispose — 스토어 싱글턴은 보통 dispose 안 하지만 테스트에서 필요
export function __disposeForTest(): void {
  window.removeEventListener('storage', handleStorageEvent);
}

// selector hooks — 컴포넌트에서 사용
export function useActivePackId(): string {
  return themePackStore((s) => s.activeId);
}

export function useAvailablePacks(): readonly ThemePack[] {
  return themePackStore((s) => s.available);
}
