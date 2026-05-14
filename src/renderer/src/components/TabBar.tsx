// TabBar.tsx — 사이클 16 MVP 탭 인프라
// TitleBar 아래 별도 행으로 렌더 (P16-3)
// role="tablist" + 각 탭 role="tab" + aria-selected (접근성)
// 모든 클릭 영역 -webkit-app-region: no-drag (P16-2)
import { useTranslation } from 'react-i18next';
import { useTabStore } from '../store/tab-store.factory';
import '../styles/tabbar.css';

interface TabBarProps {
  /** 탭 닫기 클릭 핸들러 (마지막 탭 close 시 호출자가 window close 처리) */
  readonly onCloseTab: (id: string) => void;
  /** 탭 클릭(활성화) 핸들러 */
  readonly onActivateTab: (id: string) => void;
}

/** 경로에서 파일명(basename)만 추출 — Node path 미사용 (renderer 환경) */
function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

export function TabBar({ onCloseTab, onActivateTab }: TabBarProps): JSX.Element {
  const { t } = useTranslation();
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);

  return (
    <div className="md-tabbar" role="tablist" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const label = tab.document
          ? basename(tab.document.path)
          : basename(tab.path) || t('tab.untitled');

        return (
          <div
            key={tab.id}
            className={`md-tabbar__tab${isActive ? ' md-tabbar__tab--active' : ''}`}
            role="tab"
            aria-selected={isActive}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => onActivateTab(tab.id)}
          >
            <span className="md-tabbar__tab-label" title={tab.path}>
              {label}
            </span>
            <button
              className="md-tabbar__tab-close"
              aria-label={t('tab.close.aria')}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
