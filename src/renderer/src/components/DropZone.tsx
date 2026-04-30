// DropZone — 윈도우 전체 drag&drop 핸들러
// 설계 제약:
//   - dragover + drop 양쪽 preventDefault 의무 (누락 시 Chromium이 파일을 새 탭으로 열어버림)
//   - renderer에서 File.path 직접 접근 금지 → api.getDroppedFilePath(file) 사용
//   - 다중 파일 드롭: 첫 파일만 처리, 나머지 무시 + console.warn
//   - aria: role="region" + aria-label="Drop markdown file here"
import type { DragEvent, ReactNode } from 'react';
import type { DocumentData } from '../store/document-store';

interface DropZoneProps {
  readonly children: ReactNode;
  readonly onFileDrop: (document: DocumentData) => void;
}

export function DropZone({ children, onFileDrop }: DropZoneProps): JSX.Element {
  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    if (files.length > 1) {
      console.warn('[DropZone] 다중 파일 드롭: 첫 번째 파일만 처리합니다.');
    }

    const file = files[0];
    if (!file) return;

    const filePath = window.api.getDroppedFilePath(file);
    if (!filePath) return;

    void window.api.readFile(filePath, undefined).then((result) => {
      if (result.ok) {
        onFileDrop(result.document);
      } else {
        console.error('[DropZone] 파일 읽기 실패:', result.code, result.message);
      }
    });
  }

  return (
    <div
      role="region"
      aria-label="Drop markdown file here"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  );
}
