// tab-store — Zustand vanilla store factory
// 설계 제약: 모듈 최상위 useTabStore export 금지.
// createTabStore() + React Context 주입만 허용 — 다중 윈도우 도입 시 코드 변경 0 (마스터 플랜 4.5)
// TabId = crypto.randomUUID() (P16-4)
import { createStore } from 'zustand/vanilla';
import type { DocumentData } from './document-store';

export type TabId = string;

export interface Tab {
  readonly id: TabId;
  readonly path: string;         // dedup 키 (focusOrAddByPath)
  readonly document: DocumentData | null;
  // 사이클 17 per-tab 격리 (P17-1/P17-2):
  readonly scrollSnapshot?: unknown;
  readonly activeAnchor?: string;
}

export interface TabsState {
  readonly tabs: readonly Tab[];
  readonly activeId: TabId | null;
  /** 새 탭을 추가하고 활성화한다. dedup 없음 — dedup은 focusOrAddByPath 책임. */
  readonly addTab: (path: string, document: DocumentData | null) => TabId;
  /** 탭을 닫는다. 마지막 탭 close 시 tabs=[], activeId=null. window close는 호출자 책임. */
  readonly closeTab: (id: TabId) => void;
  /** 특정 탭을 활성화한다. 미존재 id → no-op. */
  readonly activateTab: (id: TabId) => void;
  /** 같은 path 탭이 있으면 activate, 없으면 addTab + activate. sync 반환 (D1). */
  readonly focusOrAddByPath: (path: string) => TabId;
  /** 특정 탭의 document를 갱신한다. 미존재 id → no-op (R3). */
  readonly setTabDocument: (id: TabId, document: DocumentData | null) => void;
}

/** TabId 생성 헬퍼 — 테스트에서 crypto mock으로 제어 가능 */
function generateTabId(): TabId {
  return crypto.randomUUID();
}

/**
 * 활성 탭 close 시 다음 activeId를 결정한다.
 * 규칙: 직전 인덱스 우선(없으면 0번). 빈 배열이면 null.
 */
function resolveNextActiveId(
  remainingTabs: readonly Tab[],
  closedIndex: number,
): TabId | null {
  if (remainingTabs.length === 0) return null;
  const nextIndex = closedIndex > 0 ? closedIndex - 1 : 0;
  return remainingTabs[nextIndex]?.id ?? null;
}

/**
 * 윈도우 단위 tab store를 생성한다.
 * 매 호출마다 새 인스턴스를 반환한다 (전역 싱글턴 금지).
 */
export function createTabStore() {
  return createStore<TabsState>((set, get) => ({
    tabs: [],
    activeId: null,

    addTab: (path: string, document: DocumentData | null): TabId => {
      const id = generateTabId();
      const newTab: Tab = { id, path, document };
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeId: id,
      }));
      return id;
    },

    closeTab: (id: TabId): void => {
      const { tabs, activeId } = get();
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return; // 미존재 id → no-op

      const remaining = tabs.filter((t) => t.id !== id);
      const wasActive = activeId === id;
      const nextActiveId = wasActive ? resolveNextActiveId(remaining, idx) : activeId;

      set({ tabs: remaining, activeId: nextActiveId });
    },

    activateTab: (id: TabId): void => {
      const { tabs } = get();
      // 미존재 id → no-op (R3)
      if (!tabs.some((t) => t.id === id)) return;
      set({ activeId: id });
    },

    focusOrAddByPath: (path: string): TabId => {
      const { tabs, addTab, activateTab } = get();
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        activateTab(existing.id);
        return existing.id;
      }
      return addTab(path, null);
    },

    setTabDocument: (id: TabId, document: DocumentData | null): void => {
      const { tabs } = get();
      // 미존재 id → no-op (R3)
      if (!tabs.some((t) => t.id === id)) return;
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, document } : t)),
      }));
    },
  }));
}

export type TabStore = ReturnType<typeof createTabStore>;
