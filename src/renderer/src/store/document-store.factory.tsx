// document-store.factory — React Context + Provider
// 윈도우 진입점(App.tsx)에서 1회 createDocumentStore() 호출 후 Context로 주입
// 설계 제약: ThemeProvider(외) → TabProvider → DocumentProvider(내) 순서 고정 (사이클 16)
//
// 사이클 16 (D2): DocumentProvider는 TabStore를 Context에서 받아 어댑터를 생성.
// 기존 컴포넌트(SidebarView/useScrollSpy/ErrorState/MarkdownRenderer) 인터페이스 변경 0.
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  createDocumentStoreAdapter,
  type DocumentStore,
  type DocumentStoreAdapter,
  type DocumentState,
} from './document-store';
import { useTabStoreRef } from './tab-store.factory';

const DocumentStoreContext = createContext<DocumentStore | null>(null);

interface DocumentProviderProps {
  readonly children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps): JSX.Element {
  // TabStore reference 주입 — TabProvider가 상위에 있어야 함 (설계 제약)
  const tabStore = useTabStoreRef();

  // useRef로 Provider 마운트당 1회만 store 생성 (렌더 사이드이펙트 방지)
  const storeRef = useRef<DocumentStoreAdapter | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDocumentStoreAdapter(tabStore);
  }

  // Provider 언마운트 시 tabStore 구독 해제 — Strict Mode 이중 마운트·HMR·다중 윈도우 구독 누적 방지
  useEffect(() => {
    return () => {
      storeRef.current?.dispose();
    };
  }, []);

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
