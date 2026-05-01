// sidebar-empty-a11y.test.tsx — 사후: 빈 outline a11y 메시지 (P8-4)
// AC9: 빈 outline 시 role="status"로 i18n 메시지 노출
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); });
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { I18nextProvider } from 'react-i18next';
import { SidebarView } from '../../src/renderer/src/components/SidebarView';
import { createI18nInstance } from '../../src/renderer/src/i18n/index';
import type { Outline } from '@shared/markdown/heading';

const EMPTY_OUTLINE: Outline = { root: [] };
const NON_EMPTY_OUTLINE: Outline = {
  root: [
    {
      heading: { level: 2, text: '섹션 1', anchor: 'section-1' },
      children: [],
    },
  ],
};

async function renderSidebar(outline: Outline) {
  const i18n = await createI18nInstance('ko');
  return render(
    <I18nextProvider i18n={i18n}>
      <SidebarView
        outline={outline}
        activeAnchor={null}
        onJump={() => undefined}
      />
    </I18nextProvider>
  );
}

describe('SidebarView — 빈 outline a11y (P8-4)', () => {
  it('빈 outline 시 role="status" 메시지 노출', async () => {
    await renderSidebar(EMPTY_OUTLINE);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl.textContent).toBe('목차가 없습니다.');
  });

  it('비어있지 않은 outline 시 role="status" 미노출', async () => {
    await renderSidebar(NON_EMPTY_OUTLINE);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('nav aria-label이 i18n 키로 설정됨', async () => {
    await renderSidebar(EMPTY_OUTLINE);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', '문서 목차');
  });
});
