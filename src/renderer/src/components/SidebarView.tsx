// SidebarView — outline 트리를 nav/ul 재귀 렌더
// H1~H4만 표시, H5/H6는 비표시 (P8-2: level <= 4 필터)
// 들여쓰기: padding-inline-start: calc((level - 1) * 12px)
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
          {node.children.length > 0 && (
            <NodeList nodes={node.children} activeAnchor={activeAnchor} onJump={onJump} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function SidebarView({ outline, activeAnchor, onJump }: SidebarViewProps): JSX.Element {
  return (
    <nav aria-label="문서 목차" className="md-sidebar__nav">
      <NodeList nodes={outline.root} activeAnchor={activeAnchor} onJump={onJump} />
    </nav>
  );
}
