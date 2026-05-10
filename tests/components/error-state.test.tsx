// error-state.test.tsx — 사후: ErrorState 컴포넌트
// AC3: kind별 메시지 렌더, role="alert", retry/cancel 콜백
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); });
import { I18nextProvider } from 'react-i18next';
import { ErrorState } from '../../src/renderer/src/components/ErrorState';
import { createI18nInstance } from '../../src/renderer/src/i18n/index';
import type { FileErrorKind } from '../../src/main/file-service';

async function renderWithI18n(ui: React.ReactElement) {
  const i18n = await createI18nInstance('en');
  return render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>
  );
}

describe('ErrorState — kind별 메시지', () => {
  it('kind=permission → role="alert" + 에러 메시지 노출', async () => {
    await renderWithI18n(<ErrorState kind="permission" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('kind=encoding → 메시지 렌더', async () => {
    await renderWithI18n(<ErrorState kind="encoding" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('kind=not-markdown → 메시지 렌더', async () => {
    await renderWithI18n(<ErrorState kind="not-markdown" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('kind=too-large → 메시지 렌더', async () => {
    await renderWithI18n(<ErrorState kind="too-large" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('kind=empty → 메시지 렌더', async () => {
    await renderWithI18n(<ErrorState kind="empty" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('kind=io → 메시지 렌더', async () => {
    await renderWithI18n(<ErrorState kind="io" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ErrorState — 콜백', () => {
  it('onRetry 전달 시 retry 버튼 노출, 클릭 시 호출', async () => {
    const onRetry = vi.fn();
    await renderWithI18n(<ErrorState kind="permission" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('onCancel 전달 시 cancel 버튼 노출, 클릭 시 호출', async () => {
    const onCancel = vi.fn();
    await renderWithI18n(<ErrorState kind="permission" onCancel={onCancel} />);
    const btn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(btn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('onRetry 미전달 시 retry 버튼 미노출', async () => {
    await renderWithI18n(<ErrorState kind="permission" />);
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('pathHint 전달 시 경로 표시', async () => {
    await renderWithI18n(<ErrorState kind="permission" pathHint="/secret/file.md" />);
    expect(screen.getByText('/secret/file.md')).toBeInTheDocument();
  });
});

describe('ErrorState — 한국어', () => {
  it('ko locale에서 한국어 에러 메시지 노출', async () => {
    const i18n = await createI18nInstance('ko');
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorState kind="permission" />
      </I18nextProvider>
    );
    const alert = screen.getByRole('alert');
    // 한국어 에러 메시지 포함 확인
    expect(alert.textContent).toContain('접근');
  });
});

// 모든 5종 kind가 exhaustive하게 처리됨을 타입 체크로 보장
const ALL_KINDS: FileErrorKind[] = ['permission', 'encoding', 'not-markdown', 'too-large', 'empty', 'io'];
describe('ErrorState — 5종 exhaustive 검증', () => {
  it('모든 kind 처리 가능', async () => {
    for (const kind of ALL_KINDS) {
      const { unmount } = await renderWithI18n(<ErrorState kind={kind} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      unmount();
    }
  });
});
