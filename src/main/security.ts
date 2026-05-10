import type { App, Session } from 'electron';

export const SAFE_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:', 'mailto:']);

// [SEC] sandbox 활성화는 반드시 app.whenReady() 이전에 호출해야 한다.
// 이후에 호출하면 경고와 함께 무시되므로 타이밍 보장이 중요하다.
export function enableSandboxBeforeReady(app: App): void {
  app.enableSandbox();
}

// [SEC] 세션 수준 보안 정책 등록.
// - setPermissionRequestHandler: 모든 권한 요청 거부
// - webRequest.onHeadersReceived: CSP 헤더 주입 (사이클 7에서 렌더러 자산 허용으로 강화 예정)
// isDev=true 시 Vite HMR WebSocket(ws://localhost:*)을 connect-src에 추가.
export function installSessionSecurity(session: Session, isDev: boolean): void {
  // 마이크·카메라·위치 등 모든 권한 요청 거부
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // 모든 응답에 CSP 헤더를 주입한다.
  // dev: Vite HMR을 위해 localhost 스크립트·eval·inline 허용. prod: 최소 허용.
  // 사이클 7에서 mddolphin-asset:// 허용으로 강화.
  // P7-11: default-src 'none'으로 통일 (meta CSP와 동기화)
  const scriptSrc = isDev
    ? "script-src 'self' http://localhost:* 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'"
    : "script-src 'self' 'wasm-unsafe-eval'";
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:* http://localhost:*"
    : "connect-src 'none'";

  // 사이클 7: img-src에 mddolphin-asset: 추가 (로컬 자산 custom protocol 허용)
  // data: 는 raster prefix만 — JS 수준 검증은 Image.tsx에서 수행 (4.4.1 이중방어)
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'none'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: mddolphin-asset:; font-src 'self'; ${connectSrc}; object-src 'none'; base-uri 'self'`,
        ],
      },
    });
  });
}
