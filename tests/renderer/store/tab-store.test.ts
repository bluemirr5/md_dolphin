// TDD — tab-store (R1~R3)
// R1: addTab + focusOrAddByPath dedup
// R2: closeTab 마지막/경계
// R3: activateTab + setTabDocument no-op 가드

import { describe, it, expect, vi, beforeEach } from 'vitest';

// crypto.randomUUID mock — 결정론적 ID (테스트 환경에서 예측 가능)
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => {
    uuidCounter++;
    return `test-uuid-${uuidCounter}`;
  },
});

import { createTabStore } from '../../../src/renderer/src/store/tab-store';

function makeStore() {
  return createTabStore();
}

// ── R1: addTab + focusOrAddByPath dedup ──────────────────────────────────────

describe('R1 — addTab + focusOrAddByPath dedup (AC1)', () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it('addTab은 새 탭을 추가하고 TabId를 반환한다', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a/b.md', null);
    expect(id).toBeDefined();
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().tabs[0].path).toBe('/a/b.md');
  });

  it('addTab은 각 호출마다 서로 다른 id를 반환한다', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    const id2 = store.getState().addTab('/b.md', null);
    expect(id1).not.toBe(id2);
  });

  it('addTab으로 같은 path를 두 번 추가하면 tabs.length === 2 (addTab은 dedup 없음)', () => {
    const store = makeStore();
    store.getState().addTab('/same.md', null);
    store.getState().addTab('/same.md', null);
    expect(store.getState().tabs).toHaveLength(2);
  });

  it('addTab 후 activeId가 새 탭 id로 설정된다', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a.md', null);
    expect(store.getState().activeId).toBe(id);
  });

  it('focusOrAddByPath — 같은 path 2회 호출 시 tabs.length === 1 (AC1)', () => {
    const store = makeStore();
    store.getState().focusOrAddByPath('/same.md');
    store.getState().focusOrAddByPath('/same.md');
    expect(store.getState().tabs).toHaveLength(1);
  });

  it('focusOrAddByPath — 같은 path 2회 호출 시 activeId는 첫 탭 id (AC1)', () => {
    const store = makeStore();
    const id = store.getState().focusOrAddByPath('/same.md');
    const id2 = store.getState().focusOrAddByPath('/same.md');
    expect(id).toBe(id2);
    expect(store.getState().activeId).toBe(id);
  });

  it('focusOrAddByPath — 다른 path 2개는 tabs.length === 2', () => {
    const store = makeStore();
    store.getState().focusOrAddByPath('/a.md');
    store.getState().focusOrAddByPath('/b.md');
    expect(store.getState().tabs).toHaveLength(2);
  });

  it('focusOrAddByPath — 기존 탭 재포커스 시 activeId가 해당 탭으로 전환된다', () => {
    const store = makeStore();
    const id1 = store.getState().focusOrAddByPath('/a.md');
    const id2 = store.getState().focusOrAddByPath('/b.md');
    expect(store.getState().activeId).toBe(id2);
    // /a.md 재포커스
    const id1Again = store.getState().focusOrAddByPath('/a.md');
    expect(id1Again).toBe(id1);
    expect(store.getState().activeId).toBe(id1);
  });
});

// ── R2: closeTab 마지막/경계 (AC2) ───────────────────────────────────────────

describe('R2 — closeTab 마지막/경계 (AC2)', () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it('마지막 탭 closeTab 시 tabs === [] + activeId === null (AC2)', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a.md', null);
    store.getState().closeTab(id);
    expect(store.getState().tabs).toHaveLength(0);
    expect(store.getState().activeId).toBeNull();
  });

  it('2탭에서 활성 탭(마지막 인덱스) closeTab 시 직전 탭 activate (AC2)', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    // /b.md가 active (인덱스 1)
    store.getState().closeTab(store.getState().activeId!);
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeId).toBe(id1);
  });

  it('2탭에서 비활성 탭 closeTab 시 activeId는 그대로 (AC2)', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    const id2 = store.getState().addTab('/b.md', null);
    // id2 active 상태에서 id1(비활성) 닫기
    store.getState().closeTab(id1);
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeId).toBe(id2);
  });

  it('3탭에서 활성 중간 탭(인덱스 1) closeTab 시 직전 인덱스(0) 탭 activate', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    const id2 = store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    // id2를 직접 활성화 후 닫기 — 직전 인덱스(id1)로 activate
    store.getState().activateTab(id2);
    store.getState().closeTab(id2);
    expect(store.getState().tabs).toHaveLength(2);
    expect(store.getState().activeId).toBe(id1);
  });

  it('3탭에서 첫 번째 탭(인덱스 0) closeTab 시 0번 인덱스(이전 1번) activate', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    // id1(인덱스 0) 닫기 — 직전 없으므로 0번(이전 1번)으로 activate
    store.getState().closeTab(id1);
    expect(store.getState().tabs).toHaveLength(2);
    expect(store.getState().tabs[0].path).toBe('/b.md');
  });

  it('미존재 id closeTab 시 tabs 불변', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().closeTab('non-existent-id');
    expect(store.getState().tabs).toHaveLength(1);
  });
});

// ── R4: moveTab 탭 순서 변경 ─────────────────────────────────────────────────

describe('R4 — moveTab 탭 순서 변경', () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it('앞에서 뒤로 이동 (from < to): [A,B,C] moveTab(0,3) → [B,C,A]', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    store.getState().moveTab(0, 3);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(['/b.md', '/c.md', '/a.md']);
  });

  it('뒤에서 앞으로 이동 (from > to): [A,B,C] moveTab(2,0) → [C,A,B]', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    store.getState().moveTab(2, 0);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(['/c.md', '/a.md', '/b.md']);
  });

  it('중간 이동: [A,B,C] moveTab(0,2) → [B,A,C]', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    store.getState().moveTab(0, 2);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(['/b.md', '/a.md', '/c.md']);
  });

  it('같은 위치(from === toSlot-1) 이동 시 탭 순서 불변', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    const pathsBefore = store.getState().tabs.map((t) => t.path);
    store.getState().moveTab(0, 1);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(pathsBefore);
  });

  it('activeId는 이동 후에도 보존된다 (드래그한 탭이 active)', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    const id3 = store.getState().addTab('/c.md', null);
    store.getState().moveTab(2, 0);
    expect(store.getState().activeId).toBe(id3);
  });

  it('activeId는 이동 후에도 보존된다 (다른 탭이 active)', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    store.getState().addTab('/c.md', null);
    store.getState().activateTab(id1);
    store.getState().moveTab(2, 0);
    expect(store.getState().activeId).toBe(id1);
  });

  it('범위 밖 fromIndex(-1, tabs.length) → no-op', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    const pathsBefore = store.getState().tabs.map((t) => t.path);
    store.getState().moveTab(-1, 1);
    store.getState().moveTab(5, 1);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(pathsBefore);
  });

  it('범위 밖 toSlot(< 0, > tabs.length) → no-op', () => {
    const store = makeStore();
    store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    const pathsBefore = store.getState().tabs.map((t) => t.path);
    store.getState().moveTab(0, -1);
    store.getState().moveTab(0, 5);
    expect(store.getState().tabs.map((t) => t.path)).toEqual(pathsBefore);
  });
});

// ── R3: activateTab + setTabDocument no-op 가드 ───────────────────────────────

describe('R3 — activateTab + setTabDocument no-op 가드', () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it('미존재 id activateTab 시 activeId 불변 (no-op)', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a.md', null);
    store.getState().activateTab('non-existent-id');
    expect(store.getState().activeId).toBe(id);
  });

  it('activateTab으로 특정 탭 활성화', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    store.getState().addTab('/b.md', null);
    // /b.md active 상태에서 id1으로 전환
    store.getState().activateTab(id1);
    expect(store.getState().activeId).toBe(id1);
  });

  it('미존재 id setTabDocument 시 tabs 불변 (no-op)', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a.md', null);
    const docBefore = store.getState().tabs[0].document;
    store.getState().setTabDocument('non-existent-id', {
      path: '/x.md',
      rawText: '# X',
      baseDir: undefined,
    });
    expect(store.getState().tabs[0].document).toBe(docBefore);
    expect(store.getState().activeId).toBe(id);
  });

  it('setTabDocument로 특정 탭의 document를 갱신한다', () => {
    const store = makeStore();
    const id = store.getState().addTab('/a.md', null);
    const doc = { path: '/a.md', rawText: '# Hello', baseDir: '/a' as string | undefined };
    store.getState().setTabDocument(id, doc);
    const tab = store.getState().tabs.find((t) => t.id === id);
    expect(tab?.document).toEqual(doc);
  });

  it('setTabDocument는 다른 탭의 document에 영향을 주지 않는다', () => {
    const store = makeStore();
    const id1 = store.getState().addTab('/a.md', null);
    const id2 = store.getState().addTab('/b.md', null);
    store.getState().setTabDocument(id1, { path: '/a.md', rawText: '# A', baseDir: undefined });
    const tab2 = store.getState().tabs.find((t) => t.id === id2);
    expect(tab2?.document).toBeNull();
  });
});
