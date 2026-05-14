// 사후 테스트 — DocumentStore 어댑터 (AC3, D2)
// createDocumentStoreAdapter: tabStore active tab의 document derive + setDocument write-through
import { describe, it, expect } from 'vitest';
import { createTabStore } from '../../../src/renderer/src/store/tab-store';
import {
  createDocumentStoreAdapter,
} from '../../../src/renderer/src/store/document-store';
import type { DocumentData } from '../../../src/renderer/src/store/document-store';

const sampleDoc: DocumentData = {
  path: '/a/test.md',
  rawText: '# Hello',
  baseDir: '/a',
};

const sampleDoc2: DocumentData = {
  path: '/b/test.md',
  rawText: '# World',
  baseDir: '/b',
};

describe('createDocumentStoreAdapter — derive (AC3)', () => {
  it('탭이 없을 때 document는 null이다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    expect(docStore.getState().document).toBeNull();
  });

  it('탭이 있고 document가 null이면 document === null', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    tabStore.getState().addTab('/a.md', null);
    expect(docStore.getState().document).toBeNull();
  });

  it('setTabDocument 호출 후 docStore.document가 해당 document로 derive된다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    const id = tabStore.getState().addTab('/a.md', null);
    tabStore.getState().setTabDocument(id, sampleDoc);

    expect(docStore.getState().document).toEqual(sampleDoc);
  });

  it('비활성 탭의 document는 derive하지 않는다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    const id1 = tabStore.getState().addTab('/a.md', null);
    const id2 = tabStore.getState().addTab('/b.md', null);
    // id2가 active
    tabStore.getState().setTabDocument(id1, sampleDoc);
    tabStore.getState().setTabDocument(id2, sampleDoc2);

    // active는 id2 → sampleDoc2
    expect(docStore.getState().document).toEqual(sampleDoc2);

    // id1으로 전환
    tabStore.getState().activateTab(id1);
    expect(docStore.getState().document).toEqual(sampleDoc);
  });
});

describe('createDocumentStoreAdapter — dispose (구독 해제)', () => {
  it('dispose() 호출 후 tabStore 변경이 docStore에 전파되지 않는다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    const id = tabStore.getState().addTab('/a.md', null);
    tabStore.getState().setTabDocument(id, sampleDoc);
    expect(docStore.getState().document).toEqual(sampleDoc);

    // 구독 해제
    docStore.dispose();

    // 이후 tabStore 변경 → docStore에 전파 안 됨
    tabStore.getState().setTabDocument(id, sampleDoc2);
    expect(docStore.getState().document).toEqual(sampleDoc);
  });
});

describe('createDocumentStoreAdapter — write-through setDocument (AC3)', () => {
  it('setDocument 호출 시 active tab의 document가 갱신된다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    const id = tabStore.getState().addTab('/a.md', null);
    docStore.getState().setDocument(sampleDoc);

    const tab = tabStore.getState().tabs.find((t) => t.id === id);
    expect(tab?.document).toEqual(sampleDoc);
  });

  it('activeId === null이면 setDocument는 no-op (탭 없음)', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    // 탭이 없는 상태에서 setDocument 호출 — throw 없이 no-op
    expect(() => {
      docStore.getState().setDocument(sampleDoc);
    }).not.toThrow();

    expect(docStore.getState().document).toBeNull();
  });

  it('clearDocument 호출 시 active tab의 document가 null로 갱신된다', () => {
    const tabStore = createTabStore();
    const docStore = createDocumentStoreAdapter(tabStore);

    const id = tabStore.getState().addTab('/a.md', null);
    tabStore.getState().setTabDocument(id, sampleDoc);
    expect(docStore.getState().document).toEqual(sampleDoc);

    docStore.getState().clearDocument();
    const tab = tabStore.getState().tabs.find((t) => t.id === id);
    expect(tab?.document).toBeNull();
    expect(docStore.getState().document).toBeNull();
  });
});
