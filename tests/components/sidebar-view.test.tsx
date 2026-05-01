// @vitest-environment jsdom
// 사후 RTL: SidebarView 렌더·클릭·활성 강조·H5/H6 비표시
// 사이클 10: SidebarView가 useTranslation을 사용하므로 I18nextProvider로 래핑
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { I18nextProvider } from 'react-i18next';
import { type i18n } from 'i18next';
import { SidebarView } from '../../src/renderer/src/components/SidebarView';
import { createI18nInstance } from '../../src/renderer/src/i18n/index';
import type { Outline } from '../../src/shared/markdown/heading';

let i18nInstance: i18n;

beforeEach(async () => {
  i18nInstance = await createI18nInstance('ko');
});

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18nInstance}>{ui}</I18nextProvider>
  );
}

const outline: Outline = {
  root: [
    {
      heading: { level: 1, text: 'A', anchor: 'a', offset: 0 },
      children: [
        {
          heading: { level: 2, text: 'B', anchor: 'b', offset: 5 },
          children: [],
        },
        {
          heading: { level: 2, text: 'C', anchor: 'c', offset: 10 },
          children: [],
        },
      ],
    },
  ],
};

const outlineWithH5: Outline = {
  root: [
    {
      heading: { level: 1, text: 'Top', anchor: 'top', offset: 0 },
      children: [
        {
          heading: { level: 5, text: 'H5 item', anchor: 'h5-item', offset: 10 },
          children: [
            {
              heading: { level: 6, text: 'H6 item', anchor: 'h6-item', offset: 20 },
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

describe('SidebarView', () => {
  afterEach(() => { cleanup(); });
  it('nav[aria-label="문서 목차"] 루트가 존재한다', () => {
    const { container } = renderWithI18n(
      <SidebarView outline={outline} activeAnchor={null} onJump={() => {}} />,
    );
    expect(container.querySelector('nav[aria-label="문서 목차"]')).not.toBeNull();
  });

  it('ul 재귀 렌더: A, B, C 항목이 모두 표시된다', () => {
    const { getByText } = renderWithI18n(
      <SidebarView outline={outline} activeAnchor={null} onJump={() => {}} />,
    );
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
    expect(getByText('C')).toBeInTheDocument();
  });

  it('항목 클릭 시 onJump(anchor) 호출', () => {
    const onJump = vi.fn();
    const { getByText } = renderWithI18n(
      <SidebarView outline={outline} activeAnchor={null} onJump={onJump} />,
    );

    fireEvent.click(getByText('B'));
    expect(onJump).toHaveBeenCalledWith('b');
  });

  it('activeAnchor 항목에 --active 클래스 적용', () => {
    const { getByText } = renderWithI18n(
      <SidebarView outline={outline} activeAnchor="b" onJump={() => {}} />,
    );
    expect(getByText('B')).toHaveClass('md-sidebar__link--active');
    expect(getByText('C')).not.toHaveClass('md-sidebar__link--active');
  });

  it('H5/H6 항목은 렌더되지 않는다', () => {
    const { queryByText } = renderWithI18n(
      <SidebarView outline={outlineWithH5} activeAnchor={null} onJump={() => {}} />,
    );
    expect(queryByText('H5 item')).toBeNull();
    expect(queryByText('H6 item')).toBeNull();
    expect(queryByText('Top')).toBeInTheDocument();
  });

  it('빈 outline → ul이 렌더되지 않음', () => {
    const { container } = renderWithI18n(
      <SidebarView outline={{ root: [] }} activeAnchor={null} onJump={() => {}} />,
    );
    expect(container.querySelector('ul')).toBeNull();
  });

  it('H4는 표시된다', () => {
    const outlineWithH4: Outline = {
      root: [
        {
          heading: { level: 4, text: 'H4 item', anchor: 'h4-item', offset: 0 },
          children: [],
        },
      ],
    };
    const { getByText } = renderWithI18n(
      <SidebarView outline={outlineWithH4} activeAnchor={null} onJump={() => {}} />,
    );
    expect(getByText('H4 item')).toBeInTheDocument();
  });

  it('들여쓰기: H2는 paddingInlineStart 12px, H3는 24px', () => {
    const outlineWithLevels: Outline = {
      root: [
        {
          heading: { level: 1, text: 'H1', anchor: 'h1', offset: 0 },
          children: [
            {
              heading: { level: 2, text: 'H2', anchor: 'h2', offset: 5 },
              children: [
                {
                  heading: { level: 3, text: 'H3', anchor: 'h3', offset: 10 },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };
    const { getByText } = renderWithI18n(
      <SidebarView outline={outlineWithLevels} activeAnchor={null} onJump={() => {}} />,
    );
    expect(getByText('H1')).toHaveStyle({ paddingInlineStart: '0px' });
    expect(getByText('H2')).toHaveStyle({ paddingInlineStart: '12px' });
    expect(getByText('H3')).toHaveStyle({ paddingInlineStart: '24px' });
  });
});
