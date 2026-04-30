// path traversal 방어 — main process 전용. preload·renderer에서 직접 호출 금지.
// 설계 제약: 2단 검증 — path.relative 1차 + fs.realpath 2차 (symlink 경유 traversal)
import { promises as fs } from 'node:fs';
import { relative, normalize } from 'node:path';

export class OutsideBaseDirError extends Error {
  readonly code = 'OUTSIDE_BASE_DIR' as const;

  constructor(requestedPath: string, baseDir: string) {
    super(`Path "${requestedPath}" is outside base directory "${baseDir}"`);
    this.name = 'OutsideBaseDirError';
  }
}

/**
 * requestedPath가 baseDir 내부에 있는지 2단 검증한다.
 *
 * 1단: path.relative — `..`로 시작하는 상대 경로를 거부
 * 2단: fs.realpath — symlink가 baseDir 외부를 가리키는 경우 거부
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
}
