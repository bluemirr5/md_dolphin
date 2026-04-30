// AC10, AC11: enableSandboxBeforeReady / installSessionSecurity 단위 테스트 (node 환경)
import { describe, it, expect, vi } from 'vitest';
import { enableSandboxBeforeReady, installSessionSecurity } from '../../src/main/security';

type PermissionCallback = (wc: unknown, perm: string, cb: (granted: boolean) => void) => void;
type HeadersCallback = (
  details: { responseHeaders: Record<string, string[]> },
  cb: (result: { responseHeaders: Record<string, string[]> }) => void,
) => void;

describe('AC10 — enableSandboxBeforeReady', () => {
  it('app.enableSandbox()를 정확히 1회 호출한다', () => {
    const mockApp = { enableSandbox: vi.fn() };
    enableSandboxBeforeReady(mockApp as never);
    expect(mockApp.enableSandbox).toHaveBeenCalledTimes(1);
  });
});

describe('AC11 — installSessionSecurity', () => {
  it('setPermissionRequestHandler를 1회 등록한다', () => {
    const mockSession = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: {
        onHeadersReceived: vi.fn(),
      },
    };
    installSessionSecurity(mockSession as never, false);
    expect(mockSession.setPermissionRequestHandler).toHaveBeenCalledTimes(1);
  });

  it('webRequest.onHeadersReceived를 1회 등록한다', () => {
    const mockSession = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: {
        onHeadersReceived: vi.fn(),
      },
    };
    installSessionSecurity(mockSession as never, false);
    expect(mockSession.webRequest.onHeadersReceived).toHaveBeenCalledTimes(1);
  });

  it('setPermissionRequestHandler 콜백이 항상 false를 반환한다', () => {
    let capturedCallback: PermissionCallback | null = null;
    const mockSession = {
      setPermissionRequestHandler: vi.fn((cb: PermissionCallback) => {
        capturedCallback = cb;
      }),
      webRequest: {
        onHeadersReceived: vi.fn(),
      },
    };
    installSessionSecurity(mockSession as never, false);

    expect(capturedCallback).not.toBeNull();
    const grantCb = vi.fn();
    (capturedCallback as PermissionCallback)(null, 'camera', grantCb);
    expect(grantCb).toHaveBeenCalledWith(false);
  });

  it('prod CSP에는 script-src가 포함되고 기존 헤더를 유지한다', () => {
    let capturedCallback: HeadersCallback | null = null;
    const mockSession = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: {
        onHeadersReceived: vi.fn((cb: HeadersCallback) => {
          capturedCallback = cb;
        }),
      },
    };
    installSessionSecurity(mockSession as never, false);

    expect(capturedCallback).not.toBeNull();
    const responseCb = vi.fn();
    (capturedCallback as HeadersCallback)(
      { responseHeaders: { 'x-existing': ['value'] } },
      responseCb,
    );

    expect(responseCb).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(responseCb).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        responseHeaders: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          'Content-Security-Policy': expect.arrayContaining([
            expect.stringContaining('script-src'),
          ]),
          'x-existing': ['value'],
        }),
      }),
    );
  });

  it('prod CSP에는 connect-src가 none이다', () => {
    let capturedCallback: HeadersCallback | null = null;
    const mockSession = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: {
        onHeadersReceived: vi.fn((cb: HeadersCallback) => {
          capturedCallback = cb;
        }),
      },
    };
    installSessionSecurity(mockSession as never, false);
    const responseCb = vi.fn();
    (capturedCallback as HeadersCallback)({ responseHeaders: {} }, responseCb);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const csp: string = (responseCb.mock.calls[0] as [{ responseHeaders: Record<string, string[]> }])[0]
      .responseHeaders['Content-Security-Policy'][0];
    expect(csp).toContain("connect-src 'none'");
    expect(csp).not.toContain('ws://localhost');
  });

  it('dev CSP에는 connect-src에 ws://localhost가 포함된다', () => {
    let capturedCallback: HeadersCallback | null = null;
    const mockSession = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: {
        onHeadersReceived: vi.fn((cb: HeadersCallback) => {
          capturedCallback = cb;
        }),
      },
    };
    installSessionSecurity(mockSession as never, true);
    const responseCb = vi.fn();
    (capturedCallback as HeadersCallback)({ responseHeaders: {} }, responseCb);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const csp: string = (responseCb.mock.calls[0] as [{ responseHeaders: Record<string, string[]> }])[0]
      .responseHeaders['Content-Security-Policy'][0];
    expect(csp).toContain('ws://localhost:*');
    expect(csp).not.toContain("connect-src 'none'");
  });
});
