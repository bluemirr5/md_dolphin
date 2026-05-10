// asset-protocol.ts — mddolphin-asset:// custom protocol 핸들러
// 설계 제약 (P2-7): baseDir 화이트리스트 + path traversal + symlink 2단 검증 + MIME 화이트리스트
// DocumentWindowManager 인스턴스를 주입받는 함수 형태 — 전역 import 회피, 테스트 가능성 확보
import { protocol } from 'electron';
import { promises as fs } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import type { DocumentWindowManager } from './document-window';
import { assertWithinBaseDir, OutsideBaseDirError } from './path-guard';

export const ASSET_SCHEME = 'mddolphin-asset';

// 허용 MIME 화이트리스트 — raster 4종만. SVG는 사이클 9에서 DOMPurify SVG profile 적용 후 추가
const ALLOWED_MIME: ReadonlyMap<string, string> = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
]);

export type AssetResolveResult =
  | { readonly ok: true; readonly filePath: string; readonly mimeType: string }
  | { readonly ok: false; readonly reason: string };

/**
 * mddolphin-asset://<windowId>/<relPath> URL을 검증하고 절대 경로·MIME을 반환한다.
 *
 * 검증 순서:
 * 1. windowId가 등록된 baseDir에 존재하는지
 * 2. MIME 화이트리스트 확인
 * 3. path.relative `..` 거부 (path-guard 동일 로직)
 * 4. fs.realpath symlink resolve 후 baseDir 화이트리스트 재확인
 */
export async function resolveAssetRequest(
  url: URL,
  manager: DocumentWindowManager,
): Promise<AssetResolveResult> {
  // windowId는 URL의 hostname (mddolphin-asset://1/rel/path → hostname='1')
  const windowIdStr = url.hostname;
  const windowId = parseInt(windowIdStr, 10);

  if (isNaN(windowId)) {
    return { ok: false, reason: `invalid windowId: ${windowIdStr}` };
  }

  const baseDir = manager.getBaseDirById(windowId);
  if (baseDir === undefined) {
    return { ok: false, reason: `unregistered windowId: ${windowId}` };
  }

  // URL pathname에서 상대 경로 추출 — 선행 '/' 제거
  // URL 파싱 시 percent-decode 자동 처리
  const relPath = url.pathname.replace(/^\//, '');

  // MIME 화이트리스트 확인 (경로 조작 전 조기 거부)
  const ext = extname(relPath).toLowerCase();
  const mimeType = ALLOWED_MIME.get(ext);
  if (!mimeType) {
    return { ok: false, reason: `mime not allowed: ${ext || '(none)'}` };
  }

  // baseDir + relPath → 절대 경로
  const normalizedBase = normalize(baseDir);
  const requestedPath = join(normalizedBase, relPath);

  // path-guard.ts의 assertWithinBaseDir 재사용 — 보안 검사 단일 소스 (설계 제약 P2-7)
  // 1차: path.relative `..` 거부, 2차: fs.realpath symlink resolve + baseDir 재확인
  try {
    await assertWithinBaseDir(requestedPath, normalizedBase);
  } catch (err) {
    if (err instanceof OutsideBaseDirError) {
      return { ok: false, reason: `path traversal or outside baseDir: ${relPath}` };
    }
    // ENOENT 등 fs 오류 — 존재하지 않는 파일 (relPath로 보고)
    return { ok: false, reason: `file not found or inaccessible: ${relPath}` };
  }

  // assertWithinBaseDir 내부에서 fs.realpath를 거쳤으므로 realpath된 경로를 다시 얻음
  // (path-guard는 void 반환이므로 최종 경로는 여기서 별도로 resolve)
  let resolvedPath: string;
  try {
    resolvedPath = await fs.realpath(requestedPath);
  } catch {
    return { ok: false, reason: `file not found or inaccessible: ${relPath}` };
  }

  return { ok: true, filePath: resolvedPath, mimeType };
}

/**
 * mddolphin-asset:// 스킴 핸들러를 등록한다.
 * app.whenReady() 이후에 호출해야 한다.
 * protocol.registerSchemesAsPrivileged는 app.ready 이전(top-level)에 별도 호출 필요.
 */
export function registerAssetProtocol(manager: DocumentWindowManager): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response(null, { status: 400 });
    }

    const result = await resolveAssetRequest(url, manager);
    if (!result.ok) {
      return new Response(null, { status: 404 });
    }

    let fileData: Buffer;
    try {
      fileData = await fs.readFile(result.filePath);
    } catch {
      return new Response(null, { status: 404 });
    }

    return new Response(fileData, {
      status: 200,
      headers: { 'Content-Type': result.mimeType },
    });
  });
}
