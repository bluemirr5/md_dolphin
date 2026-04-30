// open-file-handler — macOS Finder 더블클릭·open 명령 처리
// 설계 제약: app.on('open-file')은 whenReady 이전에 발화 가능 → path 배열 큐잉 후 ready에서 flush
// darwin 전용 — onMacOS() 래퍼 의무 (설계 제약)
import type { App, BrowserWindow } from 'electron';
import { onMacOS } from '@shared/platform';
import { API_DOCUMENT_OPENED } from '@shared/ipc-channels';

// module-level 큐 — whenReady 이전에 수신된 파일 경로를 저장
const pendingPaths: string[] = [];

/**
 * app.on('open-file') 리스너를 등록한다.
 * darwin이 아니면 no-op.
 *
 * @param app Electron App 인스턴스
 */
export function registerOpenFileHandler(app: App): void {
  onMacOS(() => {
    app.on('open-file', (event, filePath) => {
      event.preventDefault();
      pendingPaths.push(filePath);
    });
  });
}

/**
 * 큐에 쌓인 경로를 지정된 BrowserWindow의 webContents로 flush한다.
 * flush 후 큐를 비운다.
 *
 * whenReady 후 createMainWindow()가 완료된 시점에 호출한다.
 *
 * @param window 파일 경로를 받을 BrowserWindow
 */
export function flushQueueToWindow(window: BrowserWindow): void {
  const paths = pendingPaths.splice(0, pendingPaths.length);
  for (const filePath of paths) {
    window.webContents.send(API_DOCUMENT_OPENED, filePath);
  }
}
