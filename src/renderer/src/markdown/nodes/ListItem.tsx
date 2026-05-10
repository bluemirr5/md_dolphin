import type { ReactNode } from 'react';

interface ListItemProps {
  readonly isTaskItem?: boolean;
  readonly children: ReactNode;
}

// task-list-item 분기 처리:
// markdown-it-task-lists가 li_open 토큰에 class="task-list-item" + html_inline으로 input prepend.
// html_inline → React <input>은 renderInlineTokens에서 처리.
// ListItem은 task-list-item className만 부여하고 children(이미 <input> 포함)을 렌더한다.
export function ListItem({ isTaskItem, children }: ListItemProps): JSX.Element {
  if (isTaskItem) {
    return <li className="task-list-item">{children}</li>;
  }
  return <li>{children}</li>;
}
