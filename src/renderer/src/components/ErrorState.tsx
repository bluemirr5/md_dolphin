// ErrorState — 5종 FileError kind별 에러 메시지 렌더
// ARIA: role="alert" + aria-live="polite" (접근성)
// i18n: errors.* 키로 t() 호출
// 사이클 11a (CR10-9): aria-label도 t('errors.<kind>.ariaLabel') i18n 키로 치환
import { useTranslation } from 'react-i18next';
import type { FileErrorKind } from '../../../main/file-service';

interface ErrorStateProps {
  readonly kind: FileErrorKind;
  readonly pathHint?: string;
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
}

const KIND_TO_MESSAGE_KEY: Record<FileErrorKind, string> = {
  permission: 'errors.permission.message',
  encoding: 'errors.encoding.message',
  'not-markdown': 'errors.notMarkdown.message',
  'too-large': 'errors.tooLarge.message',
  empty: 'errors.empty.message',
  io: 'errors.io.message',
};

const KIND_TO_ARIA_LABEL_KEY: Record<FileErrorKind, string> = {
  permission: 'errors.permission.ariaLabel',
  encoding: 'errors.encoding.ariaLabel',
  'not-markdown': 'errors.notMarkdown.ariaLabel',
  'too-large': 'errors.tooLarge.ariaLabel',
  empty: 'errors.empty.ariaLabel',
  io: 'errors.io.ariaLabel',
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
  const message = t(KIND_TO_MESSAGE_KEY[kind]);
  const ariaLabel = t(KIND_TO_ARIA_LABEL_KEY[kind]);
  const icon = KIND_ICON[kind];

  return (
    <div
      className="md-error-state"
      role="alert"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className="md-error-state__icon" aria-hidden="true">{icon}</span>
      <p className="md-error-state__message">{message}</p>
      {pathHint && (
        <p className="md-error-state__path">
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
