// ErrorState — 5종 FileError kind별 에러 메시지 렌더
// ARIA: role="alert" + aria-live="polite" (접근성)
// i18n: errors.* 키로 t() 호출
import { useTranslation } from 'react-i18next';
import type { FileErrorKind } from '../../../main/file-service';

interface ErrorStateProps {
  readonly kind: FileErrorKind;
  readonly pathHint?: string;
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
}

const KIND_TO_I18N_KEY: Record<FileErrorKind, string> = {
  permission: 'errors.permission',
  encoding: 'errors.encoding',
  'not-markdown': 'errors.notMarkdown',
  'too-large': 'errors.tooLarge',
  empty: 'errors.empty',
  io: 'errors.io',
};

const KIND_ICON: Record<FileErrorKind, string> = {
  permission: '🔒',
  encoding: '⚠️',
  'not-markdown': '📄',
  'too-large': '📦',
  empty: '📭',
  io: '❌',
};

export function ErrorState({ kind, pathHint, onRetry, onCancel }: ErrorStateProps): JSX.Element {
  const { t } = useTranslation();
  const message = t(KIND_TO_I18N_KEY[kind]);
  const icon = KIND_ICON[kind];

  return (
    <div
      className="md-error-state"
      role="alert"
      aria-live="polite"
    >
      <span className="md-error-state__icon" aria-hidden="true">{icon}</span>
      <p className="md-error-state__message">{message}</p>
      {pathHint && (
        <p className="md-error-state__path" aria-label="파일 경로">
          <code>{pathHint}</code>
        </p>
      )}
      <div className="md-error-state__actions">
        {onRetry && (
          <button
            type="button"
            className="md-error-state__btn md-error-state__btn--retry"
            onClick={onRetry}
          >
            {t('errors.retry')}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            className="md-error-state__btn md-error-state__btn--cancel"
            onClick={onCancel}
          >
            {t('errors.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
