// LargeFileWarning — 10MB 초과 파일 열기 확인 모달
// ARIA: role="dialog" + aria-labelledby (접근성)
// i18n: dialog.largeFile.* 키로 t() 호출
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface LargeFileWarningProps {
  readonly filePath: string;
  readonly fileSizeMb: number;
  readonly onContinue: () => void;
  readonly onCancel: () => void;
}

export function LargeFileWarning({
  filePath,
  fileSizeMb,
  onContinue,
  onCancel,
}: LargeFileWarningProps): JSX.Element {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    // 모달 오버레이
    <div className="md-modal-overlay" role="presentation">
      <div
        className="md-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="md-modal__title">
          {t('dialog.largeFile.title')}
        </h2>
        <p className="md-modal__message">
          {t('dialog.largeFile.message')}
        </p>
        <p className="md-modal__detail">
          <code>{filePath}</code>
          {' '}
          <span>({fileSizeMb.toFixed(1)} MB)</span>
        </p>
        <div className="md-modal__actions">
          <button
            type="button"
            className="md-modal__btn md-modal__btn--cancel"
            onClick={onCancel}
            autoFocus
          >
            {t('dialog.largeFile.cancel')}
          </button>
          <button
            type="button"
            className="md-modal__btn md-modal__btn--continue"
            onClick={onContinue}
          >
            {t('dialog.largeFile.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
