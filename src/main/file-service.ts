// FileService — main process에서만 사용. 파일 읽기 + 다이얼로그 열기.
// ESM 동적 import 금지 — top-level import만 사용 (설계 제약)
import { promises as fs } from 'node:fs';
import { dialog } from 'electron';
import { assertWithinBaseDir, OutsideBaseDirError } from './path-guard';

// 성공 결과
export type OpenedFile = {
  ok: true;
  document: {
    path: string;
    rawText: string;
    baseDir: string | undefined;
  };
};

// 실패 결과 — IPC 에러 contract (AC3)
export type OpenedFileError = {
  ok: false;
  code: 'OUTSIDE_BASE_DIR' | 'ENOENT' | 'EACCES' | 'DECODE_FAIL';
  message: string;
};

export type OpenedFileResult = OpenedFile | OpenedFileError;

// NodeJS 에러 코드를 IPC 에러 코드로 정규화
function normalizeErrorCode(
  err: unknown,
): 'ENOENT' | 'EACCES' | 'DECODE_FAIL' {
  if (err instanceof Error && 'code' in err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return 'ENOENT';
    if (code === 'EACCES') return 'EACCES';
    if (code === 'DECODE_FAIL') return 'DECODE_FAIL';
  }
  return 'DECODE_FAIL';
}

export class FileService {
  /**
   * 파일 경로를 읽어 OpenedFileResult를 반환한다.
   *
   * baseDir이 지정된 경우 path-guard로 traversal 검증을 수행한다.
   * baseDir: string | undefined — exactOptionalPropertyTypes 준수 (? 아님)
   */
  async readFile(
    filePath: string,
    baseDir: string | undefined,
  ): Promise<OpenedFileResult> {
    // baseDir 지정 시 path-guard 2단 검증
    if (baseDir !== undefined) {
      try {
        await assertWithinBaseDir(filePath, baseDir);
      } catch (err) {
        if (err instanceof OutsideBaseDirError) {
          return {
            ok: false,
            code: 'OUTSIDE_BASE_DIR',
            message: err.message,
          };
        }
        throw err;
      }
    }

    try {
      const rawText = await fs.readFile(filePath, 'utf8');
      return {
        ok: true,
        document: {
          path: filePath,
          rawText,
          baseDir,
        },
      };
    } catch (err) {
      return {
        ok: false,
        code: normalizeErrorCode(err),
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 파일 열기 다이얼로그를 표시하고 선택한 파일을 읽는다.
   * 취소 시 null 반환.
   * openViaDialog에서는 baseDir=undefined로 readFile 호출 —
   * 다이얼로그에서 선택한 파일은 사용자가 명시 선택했으므로 traversal 검증 불필요.
   */
  async openViaDialog(): Promise<OpenedFileResult | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Open Markdown File',
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const filePath = filePaths[0];
    if (!filePath) return null;

    // 다이얼로그 선택 파일은 baseDir을 dirname으로 자동 설정하지 않음.
    // DocumentWindow.baseDir 갱신은 ipc-handlers에서 수행 (설계 제약 P2-7).
    // readFile 내부에서 baseDir=undefined → 검증 skip
    return this.readFile(filePath, undefined);
  }
}
