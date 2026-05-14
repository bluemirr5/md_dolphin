// document-store — Zustand store factory
// 설계 제약: 모듈 최상위 useDocumentStore export 금지.
// createDocumentStore() + React Context 주입만 허용 — 다중 윈도우 도입 시 코드 변경 0 (마스터 플랜 4.5)
//
// 사이클 16 (D2): createDocumentStoreAdapter(tabStore) 신규.
// DocumentStore.document getter는 tabStore active tab의 document를 derive.
// setDocument(doc) → tabStore.setTabDocument(activeId, doc) write-through.
// 어댑터 action 함수는 zustand store reference 기반 stable closure 보장 (P16-5).
// 기존 컴포넌트 인터페이스 변경 0.
import { createStore } from 'zustand/vanilla';
import type { TabStore } from './tab-store';

export interface DocumentData {
  readonly path: string;
  readonly rawText: string;
  readonly baseDir: string | undefined;
}

export interface DocumentState {
  readonly document: DocumentData | null;
  readonly setDocument: (document: DocumentData) => void;
  readonly clearDocument: () => void;
}

/**
 * 윈도우 단위 document store를 생성한다.
 * 매 호출마다 새 인스턴스를 반환한다 (전역 싱글턴 금지).
 * 사이클 16 이후에는 createDocumentStoreAdapter 사용 권장.
 * 하위 호환성 유지를 위해 보존.
 */
export function createDocumentStore() {
  return createStore<DocumentState>((set) => ({
    document: null,
    setDocument: (document: DocumentData) => {
      set({ document });
    },
    clearDocument: () => {
      set({ document: null });
    },
  }));
}

/** DocumentStore에 dispose 메서드를 추가한 어댑터 타입 */
export type DocumentStoreAdapter = ReturnType<typeof createDocumentStore> & {
  readonly dispose: () => void;
};

/**
 * TabStore를 기반으로 한 DocumentStore 어댑터를 생성한다 (사이클 16 D2).
 *
 * - document getter: tabStore active tab의 document를 derive (O(1) selector)
 * - setDocument(doc): tabStore.setTabDocument(activeId, doc) write-through
 * - clearDocument(): active tab의 document를 null로 write-through
 * - action 함수는 tabStore reference 기반 stable closure → useCallback 의존성 churn 방지 (P16-5)
 * - dispose(): tabStore 구독 해제 — Strict Mode 이중 마운트·HMR·다중 윈도우 구독 누적 방지
 */
export function createDocumentStoreAdapter(tabStore: TabStore): DocumentStoreAdapter {
  // tabStore active tab의 document를 즉시 계산 — eager value 모델 (P16-5)
  // zustand setState는 Object.assign 기반이므로 getter는 소멸: 항상 평가된 값으로 저장.
  const computeDocument = (): DocumentData | null => {
    const { tabs, activeId } = tabStore.getState();
    if (activeId === null) return null;
    return tabs.find((t) => t.id === activeId)?.document ?? null;
  };

  // stable closure: tabStore reference 기반으로 한 번만 정의
  // (이 함수 자체가 Provider mount 시 1회만 호출되므로 closure는 안정적)
  const setDocument = (document: DocumentData): void => {
    const { activeId, setTabDocument } = tabStore.getState();
    if (activeId !== null) {
      setTabDocument(activeId, document);
    }
  };

  const clearDocument = (): void => {
    const { activeId, setTabDocument } = tabStore.getState();
    if (activeId !== null) {
      setTabDocument(activeId, null);
    }
  };

  const store = createStore<DocumentState>(() => ({
    document: computeDocument(),
    setDocument,
    clearDocument,
  }));

  // tabStore 변경 시 document 재계산 + 어댑터 store 재publish → React 구독자에게 전파
  // unsubscribe를 보존해 dispose()로 정리 가능하게 한다 (Strict Mode·HMR·다중 윈도우 대응)
  const unsubscribe = tabStore.subscribe(() => {
    store.setState({ document: computeDocument() });
  });

  return Object.assign(store, { dispose: unsubscribe });
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
