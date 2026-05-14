// tab-store.factory — React Context + Provider
// 윈도우 진입점(App.tsx)에서 1회 createTabStore() 호출 후 Context로 주입
// 설계 제약: document-store.factory.tsx와 동일 Context 패턴
// factory 패턴 의무 (4.5 표): 모듈 최상위 useTabStore export 금지
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createTabStore, type TabStore, type TabsState } from './tab-store';

// export — 사후 테스트에서 TabStoreCapture 패턴으로 직접 store 주입 시 사용
export const TabStoreContext = createContext<TabStore | null>(null);

interface TabProviderProps {
  readonly children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps): JSX.Element {
  // useRef로 Provider 마운트당 1회만 store 생성 (렌더 사이드이펙트 방지)
  const storeRef = useRef<TabStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createTabStore();
  }

  return (
    <TabStoreContext.Provider value={storeRef.current}>
      {children}
    </TabStoreContext.Provider>
  );
}

/**
 * Context에서 TabStore의 상태 일부를 선택한다.
 * TabProvider 외부에서 호출하면 에러를 throw한다.
 */
export function useTabStore<T>(selector: (state: TabsState) => T): T {
  const store = useContext(TabStoreContext);
  if (!store) {
    throw new Error('useTabStore must be used within TabProvider');
  }
  return useStore(store, selector);
}

/**
 * 외부에서 store를 직접 참조해야 할 때 (IPC 이벤트 핸들러 등) 사용.
 * TabProvider 외부에서 호출하면 에러를 throw한다.
 */
export function useTabStoreRef(): TabStore {
  const store = useContext(TabStoreContext);
  if (!store) {
    throw new Error('useTabStoreRef must be used within TabProvider');
  }
  return store;
}
