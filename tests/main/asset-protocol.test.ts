// R1 TDD: mddolphin-asset:// custom protocol 핸들러 화이트리스트
// AC1: baseDir 내부 정상 경로 통과, .. / symlink 외부 / 미등록 윈도우 / 비허용 MIME 거부
// 설계 제약: asset-protocol은 DocumentWindowManager를 인자로 주입받는 함수 형태

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock 호이스팅: factory 내부에서 vi.fn() 직접 사용
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    realpath: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
  },
}));

import { promises as fs } from 'node:fs';
import { protocol } from 'electron';
import { registerAssetProtocol, resolveAssetRequest } from '../../src/main/asset-protocol';
import type { DocumentWindowManager } from '../../src/main/document-window';

const mockRealpath = vi.mocked(fs.realpath as (path: string) => Promise<string>);
const mockReadFile = vi.mocked(fs.readFile as (path: string) => Promise<Buffer>);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockProtocolHandle = vi.mocked(protocol.handle);

// DocumentWindowManager 모의 객체 생성 헬퍼
function makeMockManager(baseDirMap: Map<number, string>): DocumentWindowManager {
  const manager = {
    getBaseDirById(windowId: number): string | undefined {
      return baseDirMap.get(windowId);
    },
  };
  return manager as unknown as DocumentWindowManager;
}

beforeEach(() => {
  vi.clearAllMocks();
  // 기본: realpath는 입력값 그대로 반환
  mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
  // 기본: readFile은 빈 버퍼 반환
  mockReadFile.mockResolvedValue(Buffer.from(''));
});

describe('resolveAssetRequest — 정상 케이스', () => {
  it('등록된 windowId의 baseDir 내부 PNG 파일은 통과한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/image.png'),
      manager,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('image/png');
      expect(result.filePath).toBe('/docs/image.png');
    }
  });

  it('중첩 디렉토리 경로도 통과한다', async () => {
    const manager = makeMockManager(new Map([[2, '/project/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://2/assets/photo.jpeg'),
      manager,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.filePath).toBe('/project/docs/assets/photo.jpeg');
    }
  });

  it('GIF 파일은 통과한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/anim.gif'),
      manager,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('image/gif');
    }
  });

  it('WEBP 파일은 통과한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/img.webp'),
      manager,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('image/webp');
    }
  });
});

describe('resolveAssetRequest — 거부 케이스', () => {
  it('미등록 windowId는 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://99/image.png'),
      manager,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/unregistered/i);
    }
  });

  it('.. traversal을 포함한 경로는 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/../etc/passwd'),
      manager,
    );
    expect(result.ok).toBe(false);
  });

  it('baseDir 외부로 향하는 symlink는 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    // 1차 path.relative는 통과하지만 realpath가 외부를 반환하면 거부
    mockRealpath.mockImplementation((p: string) => {
      if (p === '/docs/link.png') return Promise.resolve('/etc/passwd');
      return Promise.resolve(p);
    });
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/link.png'),
      manager,
    );
    expect(result.ok).toBe(false);
  });

  it('SVG 파일은 비허용 MIME으로 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/icon.svg'),
      manager,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/mime/i);
    }
  });

  it('PDF 파일은 비허용 MIME으로 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/doc.pdf'),
      manager,
    );
    expect(result.ok).toBe(false);
  });

  it('확장자 없는 파일은 거부한다', async () => {
    const manager = makeMockManager(new Map([[1, '/docs']]));
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/noextension'),
      manager,
    );
    expect(result.ok).toBe(false);
  });
});

describe('resolveAssetRequest — 윈도우 close 후 잔여 요청', () => {
  it('close 후 unregister된 windowId는 거부한다', async () => {
    // close 후 baseDirMap에서 항목 삭제된 상태 (빈 Map)
    const manager = makeMockManager(new Map());
    const result = await resolveAssetRequest(
      new URL('mddolphin-asset://1/image.png'),
      manager,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/unregistered/i);
    }
  });
});

describe('registerAssetProtocol — protocol.handle 등록', () => {
  it('protocol.handle을 mddolphin-asset 스킴으로 등록한다', () => {
    const manager = makeMockManager(new Map());
    registerAssetProtocol(manager);
    expect(mockProtocolHandle).toHaveBeenCalledWith('mddolphin-asset', expect.any(Function));
  });
});
