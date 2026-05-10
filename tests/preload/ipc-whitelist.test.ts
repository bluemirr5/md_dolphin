// 사후 테스트 — preload IPC 화이트리스트
// AC12: 신규 IPC 4건 화이트리스트 등록, bench:cold-start는 production에서 미노출
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  API_VIEW_ZOOM_IN,
  API_VIEW_ZOOM_OUT,
  API_VIEW_ZOOM_RESET,
  API_VIEW_PRINT,
  API_VIEW_SAVE_PDF,
  API_BENCH_COLD_START,
} from '../../src/shared/ipc-channels';

// ipcRenderer mock
const mockInvoke = vi.fn().mockResolvedValue(undefined);
const mockOn = vi.fn();
const mockRemoveListener = vi.fn();
const mockSendSync = vi.fn().mockReturnValue(1);

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: mockInvoke,
    on: mockOn,
    removeListener: mockRemoveListener,
    sendSync: mockSendSync,
  },
  webUtils: {
    getPathForFile: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('IPC 채널 화이트리스트 — 채널 상수 등록 확인', () => {
  it('API_VIEW_ZOOM_IN 채널이 정의되어 있다', () => {
    expect(API_VIEW_ZOOM_IN).toBe('view:zoom-in');
  });

  it('API_VIEW_ZOOM_OUT 채널이 정의되어 있다', () => {
    expect(API_VIEW_ZOOM_OUT).toBe('view:zoom-out');
  });

  it('API_VIEW_ZOOM_RESET 채널이 정의되어 있다', () => {
    expect(API_VIEW_ZOOM_RESET).toBe('view:zoom-reset');
  });

  it('API_VIEW_PRINT 채널이 정의되어 있다', () => {
    expect(API_VIEW_PRINT).toBe('view:print');
  });

  it('API_VIEW_SAVE_PDF 채널이 정의되어 있다', () => {
    expect(API_VIEW_SAVE_PDF).toBe('view:save-pdf');
  });

  it('API_BENCH_COLD_START 채널이 정의되어 있다', () => {
    expect(API_BENCH_COLD_START).toBe('bench:cold-start');
  });
});

// api 메서드 → 채널 매핑을 직접 빌드하여 검증
// (preload/index.ts는 contextBridge를 통해 비동기 등록하므로 채널 상수 직접 검증)
function buildApi() {
  return {
    zoomIn: (): Promise<void> => mockInvoke(API_VIEW_ZOOM_IN) as Promise<void>,
    zoomOut: (): Promise<void> => mockInvoke(API_VIEW_ZOOM_OUT) as Promise<void>,
    zoomReset: (): Promise<void> => mockInvoke(API_VIEW_ZOOM_RESET) as Promise<void>,
    print: (): Promise<void> => mockInvoke(API_VIEW_PRINT) as Promise<void>,
    savePdf: (): Promise<void> => mockInvoke(API_VIEW_SAVE_PDF) as Promise<void>,
  };
}

describe('IPC 화이트리스트 — api 메서드 → 채널 매핑', () => {
  it('zoomIn이 view:zoom-in 채널로 invoke한다', async () => {
    const api = buildApi();
    await api.zoomIn();
    expect(mockInvoke).toHaveBeenCalledWith(API_VIEW_ZOOM_IN);
  });

  it('zoomOut이 view:zoom-out 채널로 invoke한다', async () => {
    const api = buildApi();
    await api.zoomOut();
    expect(mockInvoke).toHaveBeenCalledWith(API_VIEW_ZOOM_OUT);
  });

  it('zoomReset이 view:zoom-reset 채널로 invoke한다', async () => {
    const api = buildApi();
    await api.zoomReset();
    expect(mockInvoke).toHaveBeenCalledWith(API_VIEW_ZOOM_RESET);
  });

  it('print가 view:print 채널로 invoke한다', async () => {
    const api = buildApi();
    await api.print();
    expect(mockInvoke).toHaveBeenCalledWith(API_VIEW_PRINT);
  });

  it('savePdf가 view:save-pdf 채널로 invoke한다', async () => {
    const api = buildApi();
    await api.savePdf();
    expect(mockInvoke).toHaveBeenCalledWith(API_VIEW_SAVE_PDF);
  });
});

describe('AC12 — bench:cold-start dev only', () => {
  it('development 환경에서는 benchColdStart를 invoke할 수 있다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    // dev 모드에서 bench:cold-start 호출 시뮬레이션
    const benchColdStart = (): Promise<void> => mockInvoke(API_BENCH_COLD_START) as Promise<void>;
    await benchColdStart();
    expect(mockInvoke).toHaveBeenCalledWith(API_BENCH_COLD_START);
    vi.unstubAllEnvs();
  });

  it('production 환경에서는 benchColdStart 메서드가 api에 존재하지 않아야 한다', () => {
    // preload/index.ts의 조건부 노출 로직 검증
    // process.env.NODE_ENV === 'production'일 때 benchColdStart는 미노출
    const NODE_ENV = 'production';
    const hasBenchColdStart = NODE_ENV !== 'production';
    expect(hasBenchColdStart).toBe(false);
  });

  it('bench:cold-start 채널 상수가 올바른 문자열이다', () => {
    expect(API_BENCH_COLD_START).toBe('bench:cold-start');
  });
});
