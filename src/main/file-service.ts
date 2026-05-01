// FileService — main process에서만 사용. 파일 읽기 + 다이얼로그 열기.
// 사이클 10: readMarkdown() 신규 + 5종 FileError + iconv-lite EUC-KR/CP949 재시도
// iconv-lite import 위치는 이 파일 단일 — renderer/preload import 금지 (설계 제약 P10-8)
import { promises as fs } from 'node:fs';
import { dialog } from 'electron';
import { decode } from 'iconv-lite';
import { assertWithinBaseDir, OutsideBaseDirError } from './path-guard';

// ── 기존 타입 (사이클 1~9 호환) ─────────────────────────────────────────────

export type OpenedFile = {
  ok: true;
  document: {
    path: string;
    rawText: string;
    baseDir: string | undefined;
  };
};

export type OpenedFileError = {
  ok: false;
  code: 'OUTSIDE_BASE_DIR' | 'ENOENT' | 'EACCES' | 'DECODE_FAIL';
  message: string;
};

export type OpenedFileResult = OpenedFile | OpenedFileError;

// ── 사이클 10 신규 타입 ─────────────────────────────────────────────────────

/**
 * 5종 에러 분류 — discriminated union exhaustiveness로 renderer가 분기 누락 시 typecheck 실패 보장.
 * kind 정의 단일 진실원: 이 파일에서만. renderer는 import type만 사용.
 */
export type FileErrorKind =
  | 'permission'   // EACCES / EPERM
  | 'encoding'     // 인코딩 관련 (향후 확장용)
  | 'not-markdown' // 모든 인코딩 시도 실패 (완전 손상)
  | 'too-large'    // 10MB 초과 (stat 단계)
  | 'empty'        // 0B 파일
  | 'io';          // 그 외 I/O 에러

export type FileError = {
  kind: FileErrorKind;
  cause?: string;
  pathHint?: string;
};

export type FileSuccessResult = {
  ok: true;
  doc: {
    text: string;
    encoding: string; // 'utf-8' | 'euc-kr' | 'cp949' 또는 iconv 인코딩 문자열
    bytes: number;
  };
};

export type FileErrorResult = {
  ok: false;
  error: FileError;
};

export type ReadMarkdownResult = FileSuccessResult | FileErrorResult;

export type StatResult = {
  size: number;
  tooLarge: boolean;
};

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 10MB: too-large 판정 기준 */
const TOO_LARGE_BYTES = 10 * 1024 * 1024;

/** 32MB: iconv 디코딩 폭탄 방어 상한 */
const ICONV_MAX_BYTES = 32 * 1024 * 1024;

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

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

/**
 * NodeJS errno 코드를 FileErrorKind로 변환한다.
 * EACCES/EPERM → permission, ENOENT → io (파일 없음), 기타 → io
 */
function errnoToKind(err: unknown): FileErrorKind {
  if (err instanceof Error && 'code' in err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') return 'permission';
    if (code === 'ENOENT') return 'io';
  }
  return 'io';
}

/**
 * Buffer를 UTF-8로 디코딩 시도한다.
 * UTF-8 invalid bytes가 있으면 null 반환 (replacement character '�' 감지).
 */
function tryDecodeUtf8(buf: Buffer): string | null {
  const text = buf.toString('utf8');
  // U+FFFD replacement character가 있으면 깨진 것으로 간주
  if (text.includes('�')) return null;
  return text;
}

/**
 * iconv-lite로 후보 인코딩을 순서대로 시도한다.
 * 성공 시 { text, encoding } 반환, 모두 실패 시 null 반환.
 */
function tryDecodeWithIconv(
  buf: Buffer,
): { text: string; encoding: string } | null {
  const candidates = ['EUC-KR', 'CP949'] as const;
  for (const enc of candidates) {
    try {
      const text = decode(buf, enc);
      // 디코딩 결과에 replacement character가 없어야 성공으로 판정
      if (!text.includes('�')) {
        return { text, encoding: enc.toLowerCase() };
      }
    } catch {
      // 이 후보 실패 → 다음 시도
    }
  }
  return null;
}

// ── FileService ───────────────────────────────────────────────────────────────

export class FileService {
  /**
   * 파일 stat을 읽어 크기와 tooLarge 여부를 반환한다.
   * file:stat IPC 사전 확인용 (10MB+ 모달 표시 전 확인).
   */
  async statFile(filePath: string): Promise<StatResult> {
    const stats = await fs.stat(filePath);
    const size = stats.size;
    return { size, tooLarge: size > TOO_LARGE_BYTES };
  }

  /**
   * 마크다운 파일을 읽어 ReadMarkdownResult를 반환한다.
   *
   * 처리 순서:
   * 1. fs.stat — 0B(empty) / 10MB+ or 32MB+(too-large) 차단
   * 2. fs.readFile (Buffer) — EACCES/EPERM → permission
   * 3. UTF-8 디코딩 시도 → 성공 시 반환
   * 4. iconv-lite EUC-KR → CP949 재시도
   * 5. 모두 실패 → not-markdown
   *
   * baseDir 지정 시 path-guard로 traversal 검증 수행.
   */
  async readMarkdown(
    filePath: string,
    baseDir: string | undefined,
  ): Promise<ReadMarkdownResult> {
    // baseDir 지정 시 path-guard 검증
    if (baseDir !== undefined) {
      try {
        await assertWithinBaseDir(filePath, baseDir);
      } catch (err) {
        if (err instanceof OutsideBaseDirError) {
          // traversal 시도는 permission 에러로 분류 — renderer가 errors.permission 메시지 노출
          return {
            ok: false,
            error: { kind: 'permission', cause: err.message, pathHint: filePath },
          };
        }
        throw err;
      }
    }

    // 1단계: stat으로 크기 사전 확인
    let fileSize: number;
    try {
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
    } catch (err) {
      const kind = errnoToKind(err);
      return {
        ok: false,
        error: { kind, cause: err instanceof Error ? err.message : String(err), pathHint: filePath },
      };
    }

    if (fileSize === 0) {
      return { ok: false, error: { kind: 'empty', pathHint: filePath } };
    }

    if (fileSize > ICONV_MAX_BYTES) {
      return { ok: false, error: { kind: 'too-large', pathHint: filePath } };
    }

    if (fileSize > TOO_LARGE_BYTES) {
      return { ok: false, error: { kind: 'too-large', pathHint: filePath } };
    }

    // 2단계: Buffer로 파일 읽기
    let buf: Buffer;
    try {
      buf = await fs.readFile(filePath);
    } catch (err) {
      const kind = errnoToKind(err);
      return {
        ok: false,
        error: { kind, cause: err instanceof Error ? err.message : String(err), pathHint: filePath },
      };
    }

    // 3단계: UTF-8 디코딩 시도
    const utf8Text = tryDecodeUtf8(buf);
    if (utf8Text !== null) {
      return {
        ok: true,
        doc: { text: utf8Text, encoding: 'utf-8', bytes: fileSize },
      };
    }

    // 4단계: iconv-lite EUC-KR/CP949 재시도
    const icovResult = tryDecodeWithIconv(buf);
    if (icovResult !== null) {
      return {
        ok: true,
        doc: { text: icovResult.text, encoding: icovResult.encoding, bytes: fileSize },
      };
    }

    // 5단계: 모든 인코딩 시도 실패
    return { ok: false, error: { kind: 'not-markdown', pathHint: filePath } };
  }

  /**
   * 파일 경로를 읽어 OpenedFileResult를 반환한다.
   * 기존 사이클 1~9 readFile 인터페이스 유지 (IPC 호환성).
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
