// window.api 타입 선언 — renderer에서 import하여 사용
// 설계 제약: preload 표면 7개 (사이클 3: openFile·readFile·openExternal·getDroppedFilePath·onDocumentOpened, 사이클 4: +getTheme·watchTheme)
import type { Api } from './index';

declare global {
  interface Window {
    readonly api: Api;
  }
}

export {};
