// DocumentWindow — 윈도우당 baseDir 관리 Map
// BrowserWindow 생성 시 register, closed 이벤트에서 자동 dispose
import type { BrowserWindow } from 'electron';

export interface DocumentWindowEntry {
  readonly window: BrowserWindow;
  baseDir: string | undefined;
}

/**
 * DocumentWindowManager
 *
 * 윈도우당 1 entry를 Map으로 관리한다.
 * register 시 'closed' 리스너를 등록하여 close 시 자동 dispose.
 * setDocument 시점에 setBaseDir로 baseDir를 갱신한다 (설계 제약 P2-7).
 */
export class DocumentWindowManager {
  private readonly entries: Map<BrowserWindow, DocumentWindowEntry> = new Map();

  /**
   * BrowserWindow를 등록하고 closed 이벤트 리스너를 설치한다.
   */
  register(window: BrowserWindow, baseDir: string | undefined): void {
    const entry: DocumentWindowEntry = { window, baseDir };
    this.entries.set(window, entry);

    window.on('closed', () => {
      this.entries.delete(window);
    });
  }

  /**
   * 등록된 윈도우의 entry를 반환한다. 미등록이면 undefined.
   */
  get(window: BrowserWindow): DocumentWindowEntry | undefined {
    return this.entries.get(window);
  }

  /**
   * windowId(BrowserWindow.id 숫자)로 baseDir를 조회한다.
   * asset-protocol이 URL의 windowId → baseDir 조회에 사용한다 (P2-7).
   * 미등록 또는 close 후 삭제된 경우 undefined 반환.
   */
  getBaseDirById(windowId: number): string | undefined {
    for (const entry of this.entries.values()) {
      if (!entry.window.isDestroyed() && entry.window.id === windowId) {
        return entry.baseDir;
      }
    }
    return undefined;
  }

  /**
   * 윈도우의 baseDir를 갱신한다.
   * setDocument 시점에 path.dirname(filePath)로 호출된다.
   */
  setBaseDir(window: BrowserWindow, baseDir: string | undefined): void {
    const entry = this.entries.get(window);
    if (entry) {
      entry.baseDir = baseDir;
    }
  }

  /**
   * 등록된 윈도우 수를 반환한다.
   */
  size(): number {
    return this.entries.size;
  }
}
