// TabBar.tsx — 사이클 16 MVP 탭 인프라
// TitleBar 아래 별도 행으로 렌더 (P16-3)
// role="tablist" + 각 탭 role="tab" + aria-selected (접근성)
// 모든 클릭 영역 -webkit-app-region: no-drag (P16-2)
import { useRef, useState } from 'react';
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
  const moveTab = useTabStore((s) => s.moveTab);

  // 드래그 소스 인덱스 — ref(재렌더 불필요) + state(드래그 중 스타일)
  const dragIndexRef = useRef<number>(-1);
  const [dragSourceIndex, setDragSourceIndex] = useState<number>(-1);
  // 삽입 슬롯 (0..tabs.length), -1 = 비활성
  const [dropSlot, setDropSlot] = useState<number>(-1);

  function clearDragState(): void {
    dragIndexRef.current = -1;
    setDragSourceIndex(-1);
    setDropSlot(-1);
  }

  return (
    <div
      className="md-tabbar"
      role="tablist"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onDragLeave={(e) => {
        // 탭바 전체를 벗어날 때만 인디케이터 해제 (자식 진입은 무시)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropSlot(-1);
        }
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        const label = tab.document
          ? basename(tab.document.path)
          : basename(tab.path) || t('tab.untitled');

        const isDraggingThis = dragSourceIndex === index;
        const isDropBefore = dropSlot === index;
        const isDropAfter = dropSlot === index + 1 && index === tabs.length - 1;

        const extraClasses = [
          isDraggingThis ? ' md-tabbar__tab--dragging' : '',
          isDropBefore ? ' md-tabbar__tab--drop-before' : '',
          isDropAfter ? ' md-tabbar__tab--drop-after' : '',
        ].join('');

        return (
          <div
            key={tab.id}
            className={`md-tabbar__tab${isActive ? ' md-tabbar__tab--active' : ''}${extraClasses}`}
            role="tab"
            aria-selected={isActive}
            draggable
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => onActivateTab(tab.id)}
            onDragStart={(e) => {
              dragIndexRef.current = index;
              setDragSourceIndex(index);
              e.dataTransfer.setData('text/plain', tab.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const rect = e.currentTarget.getBoundingClientRect();
              setDropSlot(e.clientX < rect.left + rect.width / 2 ? index : index + 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndexRef.current !== -1) {
                moveTab(dragIndexRef.current, dropSlot);
              }
              clearDragState();
            }}
            onDragEnd={clearDragState}
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
