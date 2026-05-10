// 사후 R2 — ErrorState aria-label i18n 회귀 보강 (CR10-9)
// 5종 kind ko/en 로케일에서 aria-label이 t('errors.<kind>.ariaLabel') 결과와 일치 검증
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ErrorState } from '../../src/renderer/src/components/ErrorState';
import { createI18nInstance } from '../../src/renderer/src/i18n/index';
import type { FileErrorKind } from '../../src/main/file-service';

afterEach(() => { cleanup(); });

async function renderWithLocale(ui: React.ReactElement, locale: string) {
  const i18n = await createI18nInstance(locale);
  return render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>
  );
}

// aria-label이 하드코딩이 아닌 i18n 키 결과인지 검증
// ko/en 각각 다른 값을 반환해야 하며, 한국어 하드코딩 0건을 보장
const KIND_ARIA_LABELS: Record<string, { ko: string; en: string }> = {
  permission: { ko: '권한 오류', en: 'Permission error' },
  encoding: { ko: '인코딩 오류', en: 'Encoding error' },
  'not-markdown': { ko: '마크다운 오류', en: 'Markdown error' },
  'too-large': { ko: '파일 크기 오류', en: 'File size error' },
  empty: { ko: '빈 파일 오류', en: 'Empty file error' },
};

const KINDS: FileErrorKind[] = ['permission', 'encoding', 'not-markdown', 'too-large', 'empty'];

describe('ErrorState aria-label — ko 로케일 (5종)', () => {
  for (const kind of KINDS) {
    it(`kind=${kind} → aria-label="${KIND_ARIA_LABELS[kind]!.ko}"`, async () => {
      await renderWithLocale(<ErrorState kind={kind} />, 'ko');
      const expected = KIND_ARIA_LABELS[kind]!.ko;
      // getByLabelText는 aria-label 값으로 요소를 탐색한다
      const el = screen.getByLabelText(expected);
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('role', 'alert');
    });
  }
});

describe('ErrorState aria-label — en 로케일 (5종)', () => {
  for (const kind of KINDS) {
    it(`kind=${kind} → aria-label="${KIND_ARIA_LABELS[kind]!.en}"`, async () => {
      await renderWithLocale(<ErrorState kind={kind} />, 'en');
      const expected = KIND_ARIA_LABELS[kind]!.en;
      const el = screen.getByLabelText(expected);
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('role', 'alert');
    });
  }
});

describe('ErrorState aria-label — 한국어 하드코딩 0건 (en 로케일)', () => {
  it('en 로케일에서 한국어 aria-label이 없어야 한다', async () => {
    for (const kind of KINDS) {
      await renderWithLocale(<ErrorState kind={kind} />, 'en');
      const koLabel = KIND_ARIA_LABELS[kind]!.ko;
      // ko 레이블로는 탐색 불가해야 함
      const el = screen.queryByLabelText(koLabel);
      expect(el).toBeNull();
      cleanup();
    }
  });
});
