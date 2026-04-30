// R2~R3: FileService.readFile + openViaDialog
// AC3: readFile 성공/실패 결과 형식
// AC4: openViaDialog 취소 시 null, 선택 시 readFile 위임
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';

// Electron 모듈 mock
vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    realpath: vi.fn(),
  },
}));

import { promises as fs } from 'node:fs';
import { dialog } from 'electron';
import { FileService } from '../../src/main/file-service';

// vi.fn()으로 교체된 mock에 MockInstance 타입으로 접근
// unbound-method 경고를 피하기 위해 unknown 경유로 캐스팅
const mockReadFile = fs.readFile as unknown as MockInstance<(path: string, enc: string) => Promise<string>>;
const mockRealpath = fs.realpath as unknown as MockInstance<(path: string) => Promise<string>>;
// dialog 전체를 캐스팅하여 unbound-method 규칙 우회
const dialogMock = dialog as unknown as Record<string, MockInstance>;
const mockShowOpenDialog = dialogMock['showOpenDialog'] as MockInstance<
  (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
>;

afterEach(() => {
  vi.clearAllMocks();
});

describe('FileService.readFile — R2', () => {
  beforeEach(() => {
    // realpath는 기본적으로 입력 그대로 반환
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
  });

  it('UTF-8 파일을 읽고 ok:true 결과를 반환한다', async () => {
    mockReadFile.mockResolvedValue('# Hello');

    const service = new FileService();
    const result = await service.readFile('/base/test.md', undefined);

    expect(result).toEqual({
      ok: true,
      document: {
        path: '/base/test.md',
        rawText: '# Hello',
        baseDir: undefined,
      },
    });
  });

  it('baseDir 미지정 시 path-guard를 호출하지 않고 성공한다', async () => {
    mockReadFile.mockResolvedValue('content');

    const service = new FileService();
    const result = await service.readFile('/any/path.md', undefined);

    expect(result.ok).toBe(true);
    // realpath는 path-guard 내부에서만 호출됨 — baseDir=undefined이면 호출 없음
    expect(mockRealpath).not.toHaveBeenCalled();
  });

  it('baseDir 지정 시 path-guard를 호출한다 (정상 경로 통과)', async () => {
    mockReadFile.mockResolvedValue('content');
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));

    const service = new FileService();
    const result = await service.readFile('/base/doc.md', '/base');

    expect(result.ok).toBe(true);
    expect(mockRealpath).toHaveBeenCalled();
  });

  it('baseDir 지정 시 외부 경로는 OUTSIDE_BASE_DIR 오류를 반환한다', async () => {
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));

    const service = new FileService();
    const result = await service.readFile('/etc/passwd', '/base');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('OUTSIDE_BASE_DIR');
      expect(result.message).toBeTypeOf('string');
    }
    // readFile은 호출되지 않아야 함
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('파일이 없으면 ENOENT 오류를 반환한다', async () => {
    const err = Object.assign(new Error('no such file'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValue(err);

    const service = new FileService();
    const result = await service.readFile('/base/missing.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('ENOENT');
    }
  });

  it('권한 없으면 EACCES 오류를 반환한다', async () => {
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    mockReadFile.mockRejectedValue(err);

    const service = new FileService();
    const result = await service.readFile('/base/protected.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EACCES');
    }
  });

  it('UTF-8 디코딩 실패 시 DECODE_FAIL 오류를 반환한다', async () => {
    const err = Object.assign(new Error('invalid encoding'), { code: 'DECODE_FAIL' });
    mockReadFile.mockRejectedValue(err);

    const service = new FileService();
    const result = await service.readFile('/base/binary.md', undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('DECODE_FAIL');
    }
  });

  it('baseDir 지정 시 결과 document.baseDir가 baseDir를 포함한다', async () => {
    mockReadFile.mockResolvedValue('# Test');
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));

    const service = new FileService();
    const result = await service.readFile('/base/doc.md', '/base');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.baseDir).toBe('/base');
    }
  });
});

describe('FileService.openViaDialog — R3', () => {
  beforeEach(() => {
    mockRealpath.mockImplementation((p: string) => Promise.resolve(p));
  });

  it('사용자가 취소하면 null을 반환한다', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const service = new FileService();
    const result = await service.openViaDialog();

    expect(result).toBeNull();
  });

  it('파일을 선택하면 readFile 결과를 반환한다', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/home/user/doc.md'],
    });
    mockReadFile.mockResolvedValue('# Selected');

    const service = new FileService();
    const result = await service.openViaDialog();

    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.document.path).toBe('/home/user/doc.md');
      expect(result.document.rawText).toBe('# Selected');
      expect(result.document.baseDir).toBeUndefined();
    }
  });

  it('dialog에서 .md 필터가 포함된 옵션을 전달한다', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const service = new FileService();
    await service.openViaDialog();

    expect(mockShowOpenDialog).toHaveBeenCalledOnce();
    const [callArg] = mockShowOpenDialog.mock.calls[0] as [Electron.OpenDialogOptions];
    const mdFilter = callArg.filters?.find((f) => f.extensions.includes('md'));
    expect(mdFilter).toBeDefined();
  });

  it('filePaths가 비어있으면 null을 반환한다', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });

    const service = new FileService();
    const result = await service.openViaDialog();

    expect(result).toBeNull();
  });
});
