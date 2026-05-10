// WelcomeScreen — document가 null일 때 표시되는 첫 화면
// 히어로(아이콘 + 앱명 + 태그라인) + 드롭존 버튼 + 최근 파일 목록
// 드롭은 부모 DropZone이 처리; 여기는 클릭 → openFile 다이얼로그 트리거
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';
import {
  useRecentFiles,
  useRecentFilesRemove,
  type RecentFile,
} from '../store/recent-files-store';

interface WelcomeScreenProps {
  readonly onOpenFile: () => void;
  readonly onOpenRecent: (path: string) => void;
}

export function WelcomeScreen({ onOpenFile, onOpenRecent }: WelcomeScreenProps): JSX.Element {
  const { t } = useTranslation();
  const recent = useRecentFiles();
  const remove = useRecentFilesRemove();

  return (
    <section className="md-welcome" aria-label={t('welcome.ariaLabel')}>
      <div className="md-welcome__hero">
        <BrandLogo width={220} className="md-welcome__brand" />
        <p className="md-welcome__tagline">{t('welcome.tagline')}</p>
      </div>

      <button
        type="button"
        className="md-welcome__dropzone"
        onClick={onOpenFile}
      >
        <span className="md-welcome__dropzone-primary">{t('welcome.dropzone.primary')}</span>
        <span className="md-welcome__dropzone-shortcut">{t('welcome.dropzone.shortcut')}</span>
      </button>

      {recent.length > 0 && (
        <div className="md-welcome__recent">
          <h2 className="md-welcome__recent-title">{t('welcome.recent.title')}</h2>
          <ul className="md-welcome__recent-list">
            {recent.map((file) => (
              <RecentItem
                key={file.path}
                file={file}
                onOpen={onOpenRecent}
                onRemove={remove}
                removeAria={t('welcome.recent.removeAria')}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface RecentItemProps {
  readonly file: RecentFile;
  readonly onOpen: (path: string) => void;
  readonly onRemove: (path: string) => void;
  readonly removeAria: string;
}

function RecentItem({ file, onOpen, onRemove, removeAria }: RecentItemProps): JSX.Element {
  const { basename, dirHint } = useMemo(() => splitPath(file.path), [file.path]);

  return (
    <li className="md-welcome__recent-item">
      <button
        type="button"
        className="md-welcome__recent-link"
        onClick={() => onOpen(file.path)}
        title={file.path}
      >
        <span className="md-welcome__recent-name">{basename}</span>
        <span className="md-welcome__recent-dir">{dirHint}</span>
      </button>
      <button
        type="button"
        className="md-welcome__recent-remove"
        aria-label={`${basename} — ${removeAria}`}
        onClick={() => onRemove(file.path)}
      >
        ×
      </button>
    </li>
  );
}

/** 경로를 basename + 디렉토리 힌트(홈 디렉토리는 ~로 단축)로 분리 */
function splitPath(path: string): { basename: string; dirHint: string } {
  const idx = path.lastIndexOf('/');
  if (idx < 0) return { basename: path, dirHint: '' };
  const basename = path.slice(idx + 1);
  const dir = path.slice(0, idx);
  const dirHint = dir.replace(/^\/Users\/[^/]+/, '~');
  return { basename, dirHint };
}
