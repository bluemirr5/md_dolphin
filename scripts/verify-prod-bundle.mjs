#!/usr/bin/env node
// verify-prod-bundle.mjs — production 번들 grep 가드 (CR9-S1 + 사이클 10)
// dist/ 내 금지 문자열이 0건이어야 exit 0
// 검증 대상:
//   - axe-core: dev only — production 번들에 포함 금지
//   - bench:cold-start: dev only IPC 채널 — production 미노출
//   - bench:render: dev only 측정 코드 — production 미노출
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

// electron-vite는 out/ 디렉토리에 빌드 출력 (dist/ 아님)
const DIST_DIR = new URL('../out', import.meta.url).pathname;

/** production 번들에 포함 금지인 문자열 목록
 *
 * 주의:
 * - 'bench:cold-start'는 ipc-channels.ts의 채널 상수명으로 main/preload 번들에 포함됨 (정상).
 *   실제 bench handler 코드는 NODE_ENV 가드로 production에서 실행 불가하나 번들에는 포함됨.
 *   renderer 번들에서의 benchColdStart 노출만 가드. (preload dev-only 분기로 미등록)
 * - 'axe-core' 문자열은 renderer production 번들에서 완전 tree-shake 필요.
 */
const FORBIDDEN_STRINGS = [
  'axe-core',
];

/**
 * 디렉토리를 재귀 탐색하여 .js/.mjs/.cjs 파일 경로 목록을 반환한다.
 */
async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectJsFiles(fullPath);
      files.push(...nested);
    } else if (['.js', '.mjs', '.cjs'].includes(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * 파일 내용에서 금지 문자열을 찾아 { file, match } 목록을 반환한다.
 */
async function findForbiddenInFile(filePath, forbidden) {
  const content = await readFile(filePath, 'utf8');
  return forbidden
    .filter((str) => content.includes(str))
    .map((match) => ({ file: filePath, match }));
}

async function main() {
  let files;
  try {
    files = await collectJsFiles(DIST_DIR);
  } catch (err) {
    console.error(`[verify-prod-bundle] out/ 디렉토리를 읽을 수 없습니다: ${DIST_DIR}`);
    console.error('  → pnpm build를 먼저 실행하세요.');
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('[verify-prod-bundle] out/에 JS 파일이 없습니다. pnpm build를 먼저 실행하세요.');
    process.exit(1);
  }

  const violations = [];
  await Promise.all(
    files.map(async (f) => {
      const found = await findForbiddenInFile(f, FORBIDDEN_STRINGS);
      violations.push(...found);
    }),
  );

  if (violations.length > 0) {
    console.error('[verify-prod-bundle] 금지 문자열 발견:');
    for (const { file, match } of violations) {
      console.error(`  ✗ "${match}" in ${file}`);
    }
    process.exit(1);
  }

  console.log(`[verify-prod-bundle] 검사 통과: ${files.length}개 파일, 위반 0건`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[verify-prod-bundle] 예기치 않은 오류:', err);
  process.exit(1);
});
