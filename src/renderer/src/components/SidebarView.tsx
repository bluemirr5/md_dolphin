// SidebarView — outline 트리를 nav/ul 재귀 렌더
// H1~H4만 표시, H5/H6는 비표시 (P8-2: level <= 4 필터)
// 들여쓰기: padding-inline-start: calc((level - 1) * 12px)
// 사이클 10: ARIA 보강 (P8-4) — 빈 outline 시 role="status" 메시지
import { useTranslation } from 'react-i18next';
import type { Outline, OutlineNode } from '@shared/markdown/heading';

interface SidebarViewProps {
  readonly outline: Outline;
  readonly activeAnchor: string | null;
  readonly onJump: (anchor: string) => void;
}

interface NodeListProps {
  readonly nodes: readonly OutlineNode[];
  readonly activeAnchor: string | null;
  readonly onJump: (anchor: string) => void;
}

function NodeList({ nodes, activeAnchor, onJump }: NodeListProps): JSX.Element | null {
  const visibleNodes = nodes.filter((n) => n.heading.level <= 4);
  // CR8-6 흡수: children.length === 0 빈 노드 명시 처리 — 빈 배열이면 ul 미렌더
  if (visibleNodes.length === 0) return null;

  return (
    <ul className="md-sidebar__list">
      {visibleNodes.map((node) => (
        <li key={node.heading.anchor} className="md-sidebar__item">
          <button
            type="button"
            className={`md-sidebar__link${node.heading.anchor === activeAnchor ? ' md-sidebar__link--active' : ''}`}
            style={{ paddingInlineStart: `${(node.heading.level - 1) * 12}px` }}
            onClick={() => onJump(node.heading.anchor)}
          >
            {node.heading.text}
          </button>
          {/* children.length === 0이면 NodeList null 반환 → 빈 ul 미생성 */}
          {node.children.length === 0 ? null : (
            <NodeList nodes={node.children} activeAnchor={activeAnchor} onJump={onJump} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function SidebarView({ outline, activeAnchor, onJump }: SidebarViewProps): JSX.Element {
  const { t } = useTranslation();

  const hasContent = outline.root.some((n) => n.heading.level <= 4);

  return (
    <nav
      aria-label={t('a11y.sidebar.outline')}
      className="md-sidebar__nav"
    >
      {/* P8-4: 빈 outline 시 role="status" 접근성 메시지 */}
      {!hasContent && (
        <p role="status" className="md-sidebar__empty">
          {t('a11y.outline.empty')}
        </p>
      )}
      <NodeList nodes={outline.root} activeAnchor={activeAnchor} onJump={onJump} />
    </nav>
  );
}
