// path traversal 방어 — main process 전용. preload·renderer에서 직접 호출 금지.
// 설계 제약: 3단 검증 — path.relative 1차 + fs.realpath 2차 + O_NOFOLLOW 3차 (CR7-10 흡수)
// O_NOFOLLOW: realpath 검증 후 실제 open 단계에서도 symlink 거부 (TOCTOU 방어)
import { promises as fs, constants as fsConstants } from 'node:fs';
import { relative, normalize } from 'node:path';

// O_NOFOLLOW: Linux/macOS에서 심볼릭 링크를 따라가지 않음
// fsConstants.O_NOFOLLOW가 없는 플랫폼(Windows)·mock 환경에서는 0으로 폴백 (no-op)
// 타입 캐스팅: fs.constants 타입은 O_NOFOLLOW를 포함하지 않는 @types/node 버전 대응
const O_NOFOLLOW: number = (fsConstants as unknown as Record<string, number | undefined>)['O_NOFOLLOW'] ?? 0;
const O_RDONLY = 0; // POSIX O_RDONLY

export class OutsideBaseDirError extends Error {
  readonly code = 'OUTSIDE_BASE_DIR' as const;

  constructor(requestedPath: string, baseDir: string) {
    super(`Path "${requestedPath}" is outside base directory "${baseDir}"`);
    this.name = 'OutsideBaseDirError';
  }
}

/**
 * requestedPath가 baseDir 내부에 있는지 3단 검증한다.
 *
 * 1단: path.relative — `..`로 시작하는 상대 경로를 거부
 * 2단: fs.realpath — symlink가 baseDir 외부를 가리키는 경우 거부
 * 3단: O_NOFOLLOW — open 단계 TOCTOU 방어 (CR7-10)
 *
 * @throws OutsideBaseDirError  baseDir 외부이거나 symlink가 외부를 가리킬 때
 */
export async function assertWithinBaseDir(
  requestedPath: string,
  baseDir: string,
): Promise<void> {
  // 1단: path.relative 검증
  const normalizedRequest = normalize(requestedPath);
  const normalizedBase = normalize(baseDir);
  const rel = relative(normalizedBase, normalizedRequest);

  // rel이 '..'으로 시작하거나 빈 문자열(baseDir 자체)이면 거부
  if (rel === '' || rel.startsWith('..')) {
    throw new OutsideBaseDirError(requestedPath, baseDir);
  }

  // 2단: fs.realpath 검증 (symlink 해소 후 재확인)
  const realRequest = await fs.realpath(normalizedRequest);
  const realBase = await fs.realpath(normalizedBase);

  const realRel = relative(realBase, realRequest);
  if (realRel === '' || realRel.startsWith('..')) {
    throw new OutsideBaseDirError(requestedPath, baseDir);
  }

  // 3단: O_NOFOLLOW 검증 — realpath 통과 후 실제 open에서도 symlink 거부 (TOCTOU 방어)
  // O_NOFOLLOW가 0인 플랫폼(Windows)·mock 환경에서는 skip (no-op)
  if (O_NOFOLLOW !== 0) {
    let fileHandle: fs.FileHandle | null = null;
    try {
      // O_RDONLY | O_NOFOLLOW — 읽기 전용, symlink 거부
      fileHandle = await fs.open(normalizedRequest, O_RDONLY | O_NOFOLLOW);
    } catch {
      // ELOOP: symlink를 따라가는 경우 (macOS/Linux O_NOFOLLOW 동작)
      // 기타 EPERM/EACCES 등도 거부
      throw new OutsideBaseDirError(requestedPath, baseDir);
    } finally {
      await fileHandle?.close();
    }
  }
}
