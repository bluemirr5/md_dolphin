// document-store — Zustand store factory
// 설계 제약: 모듈 최상위 useDocumentStore export 금지.
// createDocumentStore() + React Context 주입만 허용 — 다중 윈도우 도입 시 코드 변경 0 (마스터 플랜 4.5)
import { createStore } from 'zustand/vanilla';

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

export type DocumentStore = ReturnType<typeof createDocumentStore>;
