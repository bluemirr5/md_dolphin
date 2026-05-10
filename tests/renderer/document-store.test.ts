// 사후 테스트: document-store factory
// AC8: createDocumentStore() 2회 호출 → 서로 다른 인스턴스 (전역 공유 금지)
import { describe, it, expect } from 'vitest';
import { createDocumentStore } from '../../src/renderer/src/store/document-store';

describe('createDocumentStore — factory pattern (AC8)', () => {
  it('2회 호출 시 서로 다른 인스턴스를 반환한다', () => {
    const store1 = createDocumentStore();
    const store2 = createDocumentStore();

    expect(store1).not.toBe(store2);
  });

  it('초기 document는 null이다', () => {
    const store = createDocumentStore();
    const state = store.getState();
    expect(state.document).toBeNull();
  });

  it('setDocument로 document를 설정한다', () => {
    const store = createDocumentStore();
    const doc = { path: '/base/test.md', rawText: '# Hello', baseDir: '/base' as string | undefined };

    store.getState().setDocument(doc);

    const state = store.getState();
    expect(state.document).toEqual(doc);
  });

  it('setDocument 후 다른 인스턴스는 영향 받지 않는다', () => {
    const store1 = createDocumentStore();
    const store2 = createDocumentStore();

    const doc = { path: '/test.md', rawText: '# Hi', baseDir: undefined as string | undefined };
    store1.getState().setDocument(doc);

    expect(store1.getState().document).toEqual(doc);
    expect(store2.getState().document).toBeNull();
  });

  it('clearDocument로 document를 null로 초기화한다', () => {
    const store = createDocumentStore();
    const doc = { path: '/test.md', rawText: '# Hi', baseDir: undefined as string | undefined };

    store.getState().setDocument(doc);
    store.getState().clearDocument();

    expect(store.getState().document).toBeNull();
  });

  it('baseDir가 string | undefined 타입을 모두 허용한다', () => {
    const store = createDocumentStore();

    // baseDir: string
    store.getState().setDocument({ path: '/b/f.md', rawText: '', baseDir: '/b' });
    expect(store.getState().document?.baseDir).toBe('/b');

    // baseDir: undefined
    store.getState().setDocument({ path: '/f.md', rawText: '', baseDir: undefined });
    expect(store.getState().document?.baseDir).toBeUndefined();
  });
});
