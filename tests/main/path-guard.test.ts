// R1: path-guard assertWithinBaseDir
// AC1: 정상 경로 통과 / `..` 거부 / 절대경로 외부 거부
// AC2: symlink가 baseDir 외부를 가리키면 OutsideBaseDirError throw
import { describe, it, expect, vi, afterEach } from 'vitest';
import { assertWithinBaseDir, OutsideBaseDirError } from '../../src/main/path-guard';

// fs.promises.realpath를 mock하기 위해 모듈 모킹
vi.mock('node:fs', () => ({
  promises: {
    realpath: vi.fn(),
  },
}));

import { promises as fs } from 'node:fs';

const mockRealpath = vi.mocked(fs.realpath as (path: string) => Promise<string>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('assertWithinBaseDir — path.relative 1차 검증', () => {
  it('하위 경로는 통과한다', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    await expect(
      assertWithinBaseDir('/base/sub/file.md', '/base'),
    ).resolves.toBeUndefined();
  });

  it('baseDir 바로 아래 파일은 통과한다', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    await expect(
      assertWithinBaseDir('/base/file.md', '/base'),
    ).resolves.toBeUndefined();
  });

  it('..을 포함한 traversal은 거부한다', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    await expect(
      assertWithinBaseDir('/base/../etc/passwd', '/base'),
    ).rejects.toBeInstanceOf(OutsideBaseDirError);
  });

  it('baseDir 외부 절대 경로는 거부한다', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    await expect(
      assertWithinBaseDir('/other/file.md', '/base'),
    ).rejects.toBeInstanceOf(OutsideBaseDirError);
  });

  it('baseDir 자체는 거부한다 (파일이 아닌 디렉토리)', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    await expect(
      assertWithinBaseDir('/base', '/base'),
    ).rejects.toBeInstanceOf(OutsideBaseDirError);
  });
});

describe('assertWithinBaseDir — fs.realpath 2차 검증 (symlink)', () => {
  it('symlink가 baseDir 내부를 가리키면 통과한다', async () => {
    // requestedPath는 baseDir 내부이지만, realpath는 다른 내부 경로를 반환
    mockRealpath.mockImplementation((p) => {
      if (p === '/base/link.md') return Promise.resolve('/base/actual.md');
      return Promise.resolve(p);
    });
    await expect(
      assertWithinBaseDir('/base/link.md', '/base'),
    ).resolves.toBeUndefined();
  });

  it('symlink가 baseDir 외부를 가리키면 OutsideBaseDirError를 throw한다', async () => {
    // 1차 path.relative는 통과하지만 realpath가 외부를 가리킴
    mockRealpath.mockImplementation((p) => {
      if (p === '/base/link.md') return Promise.resolve('/etc/passwd');
      return Promise.resolve(p);
    });
    await expect(
      assertWithinBaseDir('/base/link.md', '/base'),
    ).rejects.toBeInstanceOf(OutsideBaseDirError);
  });

  it('OutsideBaseDirError는 code 속성을 OUTSIDE_BASE_DIR로 가진다', async () => {
    mockRealpath.mockImplementation((p) => Promise.resolve(p));
    try {
      await assertWithinBaseDir('/etc/passwd', '/base');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OutsideBaseDirError);
      expect((err as OutsideBaseDirError).code).toBe('OUTSIDE_BASE_DIR');
    }
  });
});
