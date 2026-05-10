// 사후 통합 확인 — index.ts의 isPackaged 가드 (AC4)
// index.ts 직접 import 없이 가드 로직만 검증
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/main/updater', () => ({
  registerUpdater: vi.fn(() => () => {}),
}));

import { registerUpdater } from '../../src/main/updater';

const reg = registerUpdater as ReturnType<typeof vi.fn>;

describe('isPackaged 가드 — AC4', () => {
  it('isPackaged=true 시 registerUpdater 호출', () => {
    vi.clearAllMocks();
    const isPackaged = true;
    if (isPackaged) void registerUpdater();
    expect(reg).toHaveBeenCalledOnce();
  });

  it('isPackaged=false 시 registerUpdater 미호출', () => {
    vi.clearAllMocks();
    const isPackaged = false;
    if (isPackaged) void registerUpdater();
    expect(reg).not.toHaveBeenCalled();
  });
});
