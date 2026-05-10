// AC6: api:openExternal 핸들러 — 허용 protocol(http/https/mailto) 통과, 비허용 거부 + console.warn
// P7-1: silent ignore → 명시 reject + console.warn 강화 검증
// handleOpenExternal 순수 함수를 DI로 테스트 (마스터 플랜 4.4 IPC 단일 책임)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleOpenExternal } from '../../src/main/ipc-handlers';
import type { ShellLike } from '../../src/main/ipc-handlers';

// handleOpenExternal은 순수 함수 — electron 모듈 직접 mock 불필요.
// shell을 deps로 주입하고 SAFE_EXTERNAL_PROTOCOLS만 security.ts에서 import.
// security.ts는 electron을 import하지 않으므로 별도 mock 없이 동작.

function makeShell(): { mock: ShellLike & { openExternal: ReturnType<typeof vi.fn> } } {
  const openExternal = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined);
  return { mock: { openExternal } };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('handleOpenExternal — 허용 protocol (해피패스)', () => {
  it('http:// URL은 shell.openExternal을 호출하고 resolve한다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('http://example.com', { shell }),
    ).resolves.toBeUndefined();
    expect(shell.openExternal).toHaveBeenCalledOnce();
    expect(shell.openExternal).toHaveBeenCalledWith('http://example.com');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('https:// URL은 shell.openExternal을 호출하고 resolve한다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('https://example.com', { shell }),
    ).resolves.toBeUndefined();
    expect(shell.openExternal).toHaveBeenCalledOnce();
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('mailto: URL은 shell.openExternal을 호출하고 resolve한다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('mailto:foo@example.com', { shell }),
    ).resolves.toBeUndefined();
    expect(shell.openExternal).toHaveBeenCalledOnce();
    expect(shell.openExternal).toHaveBeenCalledWith('mailto:foo@example.com');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('handleOpenExternal — 비허용 protocol (거부 케이스)', () => {
  it('file:/// URL은 reject하고 shell.openExternal을 호출하지 않는다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('file:///etc/passwd', { shell }),
    ).rejects.toThrow(/protocol not allowed/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('javascript: URL은 reject하고 shell.openExternal을 호출하지 않는다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('javascript:alert(1)', { shell }),
    ).rejects.toThrow(/protocol not allowed/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('ftp: URL은 reject하고 shell.openExternal을 호출하지 않는다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('ftp://malicious.example.com', { shell }),
    ).rejects.toThrow(/protocol not allowed/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe('handleOpenExternal — 잘못된 URL (방어적 거부)', () => {
  it('빈 문자열은 reject하고 console.warn을 호출한다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('', { shell }),
    ).rejects.toThrow(/invalid URL/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('파싱 불가능한 문자열은 reject하고 console.warn을 호출한다', async () => {
    const { mock: shell } = makeShell();
    await expect(
      handleOpenExternal('not-a-url', { shell }),
    ).rejects.toThrow(/invalid URL/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe('handleOpenExternal — 회귀: P7-1 silent ignore 방지', () => {
  it('비허용 URL reject 시 에러 메시지에 protocol 정보가 포함된다', async () => {
    const { mock: shell } = makeShell();
    const err = await handleOpenExternal('file:///secret', { shell }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('file:');
  });

  it('warn 메시지에 비허용 protocol 값이 포함된다', async () => {
    const { mock: shell } = makeShell();
    await handleOpenExternal('javascript:void(0)', { shell }).catch(() => undefined);
    const warnArgs = warnSpy.mock.calls[0] as unknown[];
    const warnText = warnArgs.join(' ');
    expect(warnText).toContain('javascript:');
  });
});
