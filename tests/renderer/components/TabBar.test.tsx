// @vitest-environment jsdom
// 사후 RTL — TabBar 컴포넌트 (AC4)
// role="tablist" / role="tab" / aria-selected + 닫기 click + activate click

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createElement, useContext } from 'react';
import { TabProvider, TabStoreContext } from '../../../src/renderer/src/store/tab-store.factory';
import type { TabStore, TabsState } from '../../../src/renderer/src/store/tab-store';
import { TabBar } from '../../../src/renderer/src/components/TabBar';

// i18next mock — t(key) → key 반환
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(() => {
  cleanup();
});

/** TabProvider 내부 store를 외부로 캡처하는 컴포넌트 */
function TabStoreCapture({ onCapture }: { onCapture: (store: TabStore) => void }) {
  const store = useContext(TabStoreContext);
  if (store) onCapture(store);
  return null;
}

/** TabProvider + TabBar + store 캡처를 한 번에 렌더하는 helper */
function setupWithTabs() {
  let capturedStore: TabStore | null = null;
  const onClose = vi.fn();
  const onActivate = vi.fn();

  const result = render(
    createElement(TabProvider, null,
      createElement(TabStoreCapture, {
        onCapture: (s) => { capturedStore = s; },
      }),
      createElement(TabBar, { onCloseTab: onClose, onActivateTab: onActivate }),
    ),
  );

  return { capturedStore, onClose, onActivate, ...result };
}

describe('TabBar — role="tablist" (AC4)', () => {
  it('role="tablist" 존재', () => {
    const { getByRole } = render(
      createElement(TabProvider, null,
        createElement(TabBar, { onCloseTab: vi.fn(), onActivateTab: vi.fn() }),
      ),
    );
    expect(getByRole('tablist')).toBeInTheDocument();
  });

  // 회귀 테스트: 빈 TabBar — tablist 항상 렌더, tab 항목 0개
  // TabBar가 조건부 렌더(tabs.length > 0일 때만 표시)로 되돌아가는 회귀를 잡기 위함
  it('탭 0개 — tablist가 렌더되고 tab 항목이 0개다', () => {
    const { getByRole, queryAllByRole } = render(
      createElement(TabProvider, null,
        createElement(TabBar, { onCloseTab: vi.fn(), onActivateTab: vi.fn() }),
      ),
    );
    expect(getByRole('tablist')).toBeInTheDocument();
    expect(queryAllByRole('tab')).toHaveLength(0);
  });
});

/** store.getState()를 TabsState로 반환 */
function getStoreState(store: TabStore): TabsState {
  return store.getState();
}

describe('TabBar — 탭 있는 경우 (AC4)', () => {
  it('탭 추가 시 role="tab" 렌더된다', () => {
    const { capturedStore, getAllByRole } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => { getStoreState(store).addTab('/a.md', null); });

    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(1);
  });

  it('활성 탭 aria-selected=true, 비활성 탭 aria-selected=false (AC4)', () => {
    const { capturedStore, getAllByRole } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => {
      getStoreState(store).addTab('/a.md', null);
      getStoreState(store).addTab('/b.md', null);
    });

    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    // 마지막 추가된 탭(b.md, 인덱스 1)이 active
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('닫기 버튼 클릭 시 onCloseTab 호출 (AC4)', () => {
    const { capturedStore, onClose } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => { getStoreState(store).addTab('/a.md', null); });

    const buttons = document.querySelectorAll('.md-tabbar__tab-close');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]!);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('탭 클릭 시 onActivateTab 호출 (AC4)', () => {
    const { capturedStore, onActivate, getAllByRole } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => {
      getStoreState(store).addTab('/a.md', null);
      getStoreState(store).addTab('/b.md', null);
    });

    const tabs = getAllByRole('tab');
    fireEvent.click(tabs[0]!);
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('닫기 버튼에 aria-label이 i18n 키("tab.close.aria")로 설정된다 (AC4)', () => {
    const { capturedStore } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => { getStoreState(store).addTab('/a.md', null); });

    const closeBtn = document.querySelector('.md-tabbar__tab-close');
    // useTranslation mock: t(key) → key 반환
    expect(closeBtn).toHaveAttribute('aria-label', 'tab.close.aria');
  });

  it('탭 컨테이너에 style 속성이 적용된다 (P16-2, AC4)', () => {
    const { capturedStore, getByRole } = setupWithTabs();
    const store = capturedStore;
    if (!store) throw new Error('store not captured');

    act(() => { getStoreState(store).addTab('/a.md', null); });

    const tablist = getByRole('tablist');
    // JSDOM 환경에서 -webkit-app-region은 비표준이므로 style 속성 자체 존재 확인
    // 실제 macOS 환경에서는 tabbar.css의 -webkit-app-region: no-drag로 동작
    expect(tablist).toHaveStyle({ webkitAppRegion: undefined });
    // md-tabbar 클래스 확인
    expect(tablist).toHaveClass('md-tabbar');
  });
});
