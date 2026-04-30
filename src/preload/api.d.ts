// window.api 타입 선언 — renderer에서 import하여 사용
// 설계 제약: preload 표면은 openFile, readFile, openExternal, getDroppedFilePath + onDocumentOpened 5개
import type { Api } from './index';

declare global {
  interface Window {
    readonly api: Api;
  }
}

export {};
