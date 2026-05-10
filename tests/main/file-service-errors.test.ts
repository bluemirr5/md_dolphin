// R1 TDD: FileService 에러 분기 + 인코딩 감지
// AC1: 5종 FileError(permission/encoding/not-markdown/too-large/empty) + iconv-lite EUC-KR 재시도
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    realpath: vi.fn(),
    stat: vi.fn(),
  },
  constants: {},
}));

vi.mock('iconv-lite', () => ({
  decode: vi.fn(),
}));

import { promises as fs } from 'node:fs';
import * as iconvLite from 'iconv-lite';
import { FileService } from '../../src/main/file-service';

const mockReadFile = fs.readFile as unknown as MockInstance;
const mockRealpath = fs.realpath as unknown as MockInstance;
const mockStat = fs.stat as unknown as MockInstance;
const mockDecode = iconvLite.decode as unknown as MockInstance;

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
});

describe('FileService.readMarkdown — 5종 FileError 분기', () => {
  it('EACCES 에러 → kind: permission 반환', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    mockReadFile.mockRejectedValue(err);

    const service = new FileService();
    const result = await service.readMarkdown('/protected.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('permission');
    }
  });

  it('EPERM 에러 → kind: permission 반환', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    const err = Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
    mockReadFile.mockRejectedValue(err);

    const service = new FileService();
    const result = await service.readMarkdown('/protected.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('permission');
    }
  });

  it('빈 파일(0B) → kind: empty 반환', async () => {
    mockStat.mockResolvedValue({ size: 0 });

    const service = new FileService();
    const result = await service.readMarkdown('/empty.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('empty');
    }
    // stat 단계에서 차단 → readFile 미호출
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('10MB 초과 파일 → kind: too-large 반환 (read 미실행)', async () => {
    const TEN_MB = 10 * 1024 * 1024;
    mockStat.mockResolvedValue({ size: TEN_MB + 1 });

    const service = new FileService();
    const result = await service.readMarkdown('/huge.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('too-large');
    }
    // stat 단계에서 차단 → readFile 미호출
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('UTF-8 정상 파일 → ok:true, encoding: utf-8', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    mockReadFile.mockResolvedValue(Buffer.from('# Hello UTF-8'));

    const service = new FileService();
    const result = await service.readMarkdown('/normal.md', undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.encoding).toBe('utf-8');
      expect(result.doc.text).toBe('# Hello UTF-8');
    }
  });

  it('UTF-8 깨진 바이트 → EUC-KR 재시도 성공 → encoding: euc-kr', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    // Buffer with non-UTF8 bytes
    const rawBuf = Buffer.from([0xc7, 0xd1, 0xb1, 0xdb]); // 한글 EUC-KR bytes
    mockReadFile.mockResolvedValue(rawBuf);
    // iconv-lite EUC-KR 디코딩 성공 시뮬레이션
    mockDecode.mockImplementation((_buf: Buffer, encoding: string) => {
      if (encoding === 'EUC-KR') return '한글';
      throw new Error('decode failed');
    });

    const service = new FileService();
    const result = await service.readMarkdown('/euckr.md', undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.encoding).toBe('euc-kr');
      expect(result.doc.text).toBe('한글');
    }
  });

  it('UTF-8 깨진 바이트 → CP949 재시도 성공 → encoding: cp949', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    const rawBuf = Buffer.from([0xc7, 0xd1, 0xb1, 0xdb]);
    mockReadFile.mockResolvedValue(rawBuf);
    // EUC-KR 실패, CP949 성공
    mockDecode.mockImplementation((_buf: Buffer, encoding: string) => {
      if (encoding === 'EUC-KR') throw new Error('EUC-KR failed');
      if (encoding === 'CP949') return '한글cp949';
      throw new Error('decode failed');
    });

    const service = new FileService();
    const result = await service.readMarkdown('/cp949.md', undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.encoding).toBe('cp949');
      expect(result.doc.text).toBe('한글cp949');
    }
  });

  it('UTF-8·EUC-KR·CP949 모두 실패 → kind: not-markdown 반환', async () => {
    mockStat.mockResolvedValue({ size: 100 });
    const rawBuf = Buffer.from([0xff, 0xfe, 0x00, 0x01]); // 완전 손상 바이너리
    mockReadFile.mockResolvedValue(rawBuf);
    mockDecode.mockImplementation(() => { throw new Error('decode failed'); });

    const service = new FileService();
    const result = await service.readMarkdown('/binary.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('not-markdown');
    }
  });

  it('32MB 초과 파일 → kind: too-large (iconv BOMB 방어)', async () => {
    const THIRTY_TWO_MB = 32 * 1024 * 1024;
    mockStat.mockResolvedValue({ size: THIRTY_TWO_MB + 1 });

    const service = new FileService();
    const result = await service.readMarkdown('/bomb.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('too-large');
    }
  });
});

describe('FileService.statFile — file:stat IPC 사전 확인', () => {
  it('정상 파일 → { size, tooLarge: false }', async () => {
    mockStat.mockResolvedValue({ size: 1000 });

    const service = new FileService();
    const result = await service.statFile('/normal.md');

    expect(result).toEqual({ size: 1000, tooLarge: false });
  });

  it('10MB 초과 파일 → { size, tooLarge: true }', async () => {
    const TEN_MB = 10 * 1024 * 1024;
    mockStat.mockResolvedValue({ size: TEN_MB + 1 });

    const service = new FileService();
    const result = await service.statFile('/huge.md');

    expect(result.tooLarge).toBe(true);
  });

  it('stat 실패(EACCES) → permission 에러 throw', async () => {
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    mockStat.mockRejectedValue(err);

    const service = new FileService();
    await expect(service.statFile('/protected.md')).rejects.toThrow();
  });
});
