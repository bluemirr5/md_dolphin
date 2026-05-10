// document-store.factory — React Context + Provider
// 윈도우 진입점(App.tsx)에서 1회 createDocumentStore() 호출 후 Context로 주입
// 설계 제약: ThemeProvider(외) → DocumentProvider(내) 순서 고정 (사이클 4 적용 시)
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createDocumentStore, type DocumentStore, type DocumentState } from './document-store';

const DocumentStoreContext = createContext<DocumentStore | null>(null);

interface DocumentProviderProps {
  readonly children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps): JSX.Element {
  // useRef로 Provider 마운트당 1회만 store 생성 (렌더 사이드이펙트 방지)
  const storeRef = useRef<DocumentStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDocumentStore();
  }

  return (
    <DocumentStoreContext.Provider value={storeRef.current}>
      {children}
    </DocumentStoreContext.Provider>
  );
}

/**
 * Context에서 DocumentStore의 상태 일부를 선택한다.
 * DocumentProvider 외부에서 호출하면 에러를 throw한다.
 */
export function useDocumentStore<T>(selector: (state: DocumentState) => T): T {
  const store = useContext(DocumentStoreContext);
  if (!store) {
    throw new Error('useDocumentStore must be used within DocumentProvider');
  }
  return useStore(store, selector);
}

/**
 * 외부에서 store를 직접 참조해야 할 때 (IPC 이벤트 핸들러 등) 사용.
 * DocumentProvider 외부에서 호출하면 에러를 throw한다.
 */
export function useDocumentStoreRef(): DocumentStore {
  const store = useContext(DocumentStoreContext);
  if (!store) {
    throw new Error('useDocumentStoreRef must be used within DocumentProvider');
  }
  return store;
}
