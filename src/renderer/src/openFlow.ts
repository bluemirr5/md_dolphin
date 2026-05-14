// openFlow.ts — 파일 열기 통합 헬퍼 hook (P16-3, P16-6, D1)
// 3경로(⌘O keydown / API_DOCUMENT_OPENED / DropZone) + ⌘O dialog 모두 경유.
// focusOrAddByPath: same path → 기존 탭 포커스, new path → addTab → file read → setTabDocument.
// pushRecent는 file read 성공 시 1회 호출 (P16-3 — App.tsx setDocument 래퍼 제거 대응).
import { useCallback } from 'react';
import { useTabStoreRef } from './store/tab-store.factory';
import { useRecentFilesPush } from './store/recent-files-store';
import type { FileErrorKind } from '../../main/file-service';

export interface OpenFlowResult {
  /**
   * 파일 경로를 받아 탭을 열거나 포커스한다.
   * stat 확인 → too-large이면 null 반환(호출자가 모달 처리),
   * 정상이면 탭 추가 + document 설정 또는 에러 반환.
   */
  readonly openFilePath: (filePath: string) => Promise<OpenFileOutcome>;
  /**
   * 다이얼로그를 열어 파일을 선택한 후 탭을 연다.
   */
  readonly openFileViaDialog: () => Promise<OpenFileOutcome>;
}

export type OpenFileOutcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'too-large'; readonly sizeMb: number; readonly filePath: string }
  | { readonly kind: 'error'; readonly errorKind: FileErrorKind; readonly pathHint: string | undefined };

/** 파일 크기(bytes) → MB 소수점 1자리 */
function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

/** 구 API OpenedFileResult의 code를 FileErrorKind로 변환 */
function openedCodeToKind(code: string): FileErrorKind {
  if (code === 'EACCES' || code === 'OUTSIDE_BASE_DIR') return 'permission';
  if (code === 'ENOENT') return 'io';
  return 'io';
}

/**
 * 파일 열기 통합 hook.
 * TabStore + RecentFiles를 통합 — App.tsx에서 1회 호출.
 */
export function useOpenFlow(): OpenFlowResult {
  const tabStore = useTabStoreRef();
  const pushRecent = useRecentFilesPush();

  const openFilePath = useCallback(async (filePath: string): Promise<OpenFileOutcome> => {
    // stat 사전 확인 — fileStat이 없는 환경(테스트)에서는 skip
    try {
      const stat = await window.api.fileStat(filePath);
      if (stat.tooLarge) {
        return { kind: 'too-large', sizeMb: bytesToMb(stat.size), filePath };
      }
    } catch {
      // stat 실패 시 readFile로 진행 (ENOENT 등은 readFile에서 재처리)
    }

    // D1: focusOrAddByPath sync 반환 — 같은 path는 기존 탭 활성화, 새 path는 즉시 탭 생성
    const tabId = tabStore.getState().focusOrAddByPath(filePath);

    const result = await window.api.openFilePath(filePath);
    if (result.ok) {
      // D1: file read 후 setTabDocument(id, doc) write
      tabStore.getState().setTabDocument(tabId, result.document);
      // P16-3: pushRecent는 openFlow에서 1회 호출
      pushRecent(filePath);
      return { kind: 'ok' };
    } else {
      // 에러 시 빈 탭 상태 유지 (사용자가 명시 close 가능 — 설계 제약 에러 케이스)
      return { kind: 'error', errorKind: openedCodeToKind(result.code), pathHint: filePath };
    }
  }, [tabStore, pushRecent]);

  const openFileViaDialog = useCallback(async (): Promise<OpenFileOutcome> => {
    const result = await window.api.openFile();
    if (result === null) {
      return { kind: 'cancelled' };
    }
    if (result.ok) {
      const tabId = tabStore.getState().focusOrAddByPath(result.document.path);
      tabStore.getState().setTabDocument(tabId, result.document);
      // P16-3: pushRecent는 openFlow에서 1회 호출
      pushRecent(result.document.path);
      return { kind: 'ok' };
    } else {
      return { kind: 'error', errorKind: openedCodeToKind(result.code), pathHint: undefined };
    }
  }, [tabStore, pushRecent]);

  return { openFilePath, openFileViaDialog };
}
