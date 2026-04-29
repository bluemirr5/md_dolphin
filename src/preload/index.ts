import { contextBridge } from 'electron';

// 사이클 1: 빈 표면. 사이클 3에서 openFile/readFile 등 추가.
const api = {
  // 후속 사이클에서 채움
} as const;

try {
  contextBridge.exposeInMainWorld('api', api);
} catch (error) {
  // contextIsolation이 false인 경우 fallback. 사이클 1 정책상 절대 도달하면 안 됨.
  console.error('[preload] contextBridge 노출 실패:', error);
}

export type Api = typeof api;
