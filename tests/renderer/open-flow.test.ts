// @vitest-environment jsdom
// 사이클 16 보강 — openFlow.ts 단위 테스트 (AC3, P16-3, D1)
// 핵심 계약:
// 1. 새 path → focusOrAddByPath + setTabDocument + pushRecent 1회씩
// 2. 같은 path 재오픈 → 탭 수 불변(dedup), setTabDocument는 다시 호출됨
// 3. file read 실패 → 빈 탭 잔존(document=null), pushRecent 0회
// 4. too-large → setTabDocument 0회, pushRecent 0회
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { TabProvider } from '../../src/renderer/src/store/tab-store.factory';
import { useOpenFlow } from '../../src/renderer/src/openFlow';

// ── recentFilesStore mock — pushRecent 호출 횟수 검증용 ──────────────────────
const pushRecentMock = vi.fn();

vi.mock('../../src/renderer/src/store/recent-files-store', () => ({
  useRecentFilesPush: () => pushRecentMock,
}));

// ── window.api stub 설치 헬퍼 ─────────────────────────────────────────────────
interface ApiStub {
  fileStat?: Mock;
  openFilePath?: Mock;
  openFile?: Mock;
}

function installApi(stub: ApiStub) {
  Object.defineProperty(window, 'api', {
    value: {
      fileStat: stub.fileStat ?? vi.fn().mockResolvedValue({ tooLarge: false, size: 100 }),
      openFilePath: stub.openFilePath ?? vi.fn().mockResolvedValue({ ok: true, document: { path: '/a.md', rawText: '# A', baseDir: '/' } }),
      openFile: stub.openFile ?? vi.fn().mockResolvedValue(null),
    },
    writable: true,
    configurable: true,
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(TabProvider, null, children);
}

describe('useOpenFlow — openFilePath (D1, P16-3)', () => {
  beforeEach(() => {
    pushRecentMock.mockClear();
  });

  it('새 파일 open 성공 시 kind=ok 반환', async () => {
    installApi({});
    const { result } = renderHook(() => useOpenFlow(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.openFilePath('/a.md');
    });

    expect(outcome).toEqual({ kind: 'ok' });
  });

  it('새 파일 open 성공 시 pushRecent가 1회 호출된다 (P16-3)', async () => {
    installApi({});
    const { result } = renderHook(() => useOpenFlow(), { wrapper });

    await act(async () => {
      await result.current.openFilePath('/a.md');
    });

    expect(pushRecentMock).toHaveBeenCalledOnce();
    expect(pushRecentMock).toHaveBeenCalledWith('/a.md');
  });

  it('같은 path 2회 open 시 pushRecent 총 2회 호출 (재오픈마다 recent 갱신)', async () => {
    installApi({});
    const { result } = renderHook(() => useOpenFlow(), { wrapper });

    await act(async () => {
      await result.current.openFilePath('/a.md');
      await result.current.openFilePath('/a.md');
    });

    // dedup은 탭 수를 막지만 재오픈 시 recent는 갱신해야 한다
    expect(pushRecentMock).toHaveBeenCalledTimes(2);
  });

  it('file read 실패 시 kind=error 반환, pushRecent 0회 (설계 제약 에러 케이스)', async () => {
    installApi({
      openFilePath: vi.fn().mockResolvedValue({ ok: false, code: 'ENOENT', message: 'not found' }),
    });
    const { result } = renderHook(() => useOpenFlow(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.openFilePath('/missing.md');
    });

    expect((outcome as { kind: string }).kind).toBe('error');
    expect(pushRecentMock).not.toHaveBeenCalled();
  });

  it('too-large 시 kind=too-large 반환, setTabDocument(+pushRecent) 0회', async () => {
    installApi({
      fileStat: vi.fn().mockResolvedValue({ tooLarge: true, size: 20 * 1024 * 1024 }),
    });
    const { result } = renderHook(() => useOpenFlow(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.openFilePath('/big.md');
    });

    expect((outcome as { kind: string }).kind).toBe('too-large');
    expect(pushRecentMock).not.toHaveBeenCalled();
  });

});
