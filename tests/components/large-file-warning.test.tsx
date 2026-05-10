// large-file-warning.test.tsx — 사후: LargeFileWarning 컴포넌트
// AC4: 모달 표시, 취소 시 onCancel 호출, role="dialog" + aria-labelledby
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => { cleanup(); });
import { I18nextProvider } from 'react-i18next';
import { LargeFileWarning } from '../../src/renderer/src/components/LargeFileWarning';
import { createI18nInstance } from '../../src/renderer/src/i18n/index';

async function renderWarning(props: {
  onContinue?: () => void;
  onCancel?: () => void;
}) {
  const i18n = await createI18nInstance('en');
  return render(
    <I18nextProvider i18n={i18n}>
      <LargeFileWarning
        filePath="/large-file.md"
        fileSizeMb={12.5}
        onContinue={props.onContinue ?? vi.fn()}
        onCancel={props.onCancel ?? vi.fn()}
      />
    </I18nextProvider>
  );
}

describe('LargeFileWarning — ARIA', () => {
  it('role="dialog" + aria-modal + aria-labelledby', async () => {
    await renderWarning({});
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('aria-labelledby가 제목 요소 id를 참조', async () => {
    await renderWarning({});
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.tagName).toBe('H2');
  });
});

describe('LargeFileWarning — 버튼', () => {
  it('취소 버튼 클릭 시 onCancel 호출', async () => {
    const onCancel = vi.fn();
    await renderWarning({ onCancel });
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('계속 버튼 클릭 시 onContinue 호출', async () => {
    const onContinue = vi.fn();
    await renderWarning({ onContinue });
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('파일 경로가 모달에 표시됨', async () => {
    await renderWarning({});
    expect(screen.getByText('/large-file.md')).toBeInTheDocument();
  });

  it('파일 크기가 MB 단위로 표시됨', async () => {
    await renderWarning({});
    expect(screen.getByText('(12.5 MB)')).toBeInTheDocument();
  });
});
