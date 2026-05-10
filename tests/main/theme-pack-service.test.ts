// R2 TDD — theme-pack-service.ts
// 빌트인 3종 반환, user JSON 추가, symlink 거부, JSON 깨짐 skip, builtin id prefix
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';

// fs.promises + electron.app 모킹
vi.mock('node:fs', () => {
  const actual = vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
      readFile: vi.fn().mockResolvedValue('{}'),
      lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => false }),
    },
  };
});

vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((_name: string) => '/fake/userData'),
    },
    shell: {
      showItemInFolder: vi.fn(),
    },
  };
});

import { createThemePackService } from '@shared/../main/theme-pack-service';
import { promises as fsMock } from 'node:fs';
import { shell as electronShell } from 'electron';

const themesDir = '/fake/userData/themes';

const VALID_PACK_JSON = {
  name: 'Test Pack',
  light: {
    'color.bg': '#FAFAF7',
    'color.text': '#1A1A1A',
    'color.text.muted': '#6B7280',
    'color.code.bg': '#F0EDE6',
    'color.quote.bar': '#C0B090',
    'color.heading.h1': '#1A1A1A',
    'color.heading.h2': '#1A1A1A',
    'color.heading.h3': '#1A1A1A',
    'color.heading.h4': '#1A1A1A',
    'color.link': '#0A66C2',
    'color.link.external': '#0A66C2',
    'color.link.tooltip.bg': '#333333',
    'color.link.tooltip.text': '#FFFFFF',
    'color.table.border': '#D1D1D6',
    'color.table.header.bg': '#F0EDE6',
    'color.table.row.alt.bg': '#FAFAF7',
    'color.image.fallback.border': '#D1D1D6',
    'color.image.caption.text': '#6B7280',
    'color.sidebar.bg': '#FAFAF7',
    'color.sidebar.border': '#F0EDE6',
    'color.sidebar.link.active': '#C0B090',
  },
  dark: {
    'color.bg': '#1C1C1E',
    'color.text': '#E5E5E7',
    'color.text.muted': '#9CA3AF',
    'color.code.bg': '#2C2C2E',
    'color.quote.bar': '#8A7A60',
    'color.heading.h1': '#E5E5E7',
    'color.heading.h2': '#E5E5E7',
    'color.heading.h3': '#E5E5E7',
    'color.heading.h4': '#E5E5E7',
    'color.link': '#5BA8FF',
    'color.link.external': '#5BA8FF',
    'color.link.tooltip.bg': '#1C1C1E',
    'color.link.tooltip.text': '#E5E5E7',
    'color.table.border': '#3A3A3C',
    'color.table.header.bg': '#2C2C2E',
    'color.table.row.alt.bg': '#1C1C1E',
    'color.image.fallback.border': '#3A3A3C',
    'color.image.caption.text': '#9CA3AF',
    'color.sidebar.bg': '#1C1C1E',
    'color.sidebar.border': '#2C2C2E',
    'color.sidebar.link.active': '#8A7A60',
  },
  shiki: { light: 'github-light', dark: 'github-dark' },
};

describe('ThemePackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 빈 themes 디렉토리
    vi.mocked(fsMock.readdir).mockResolvedValue([]);
    vi.mocked(fsMock.lstat).mockResolvedValue({ isSymbolicLink: () => false } as ReturnType<typeof vi.fn>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listPacks', () => {
    it('빈 dir → 빌트인 5종만 반환해야 한다', async () => {
      const service = createThemePackService();
      const packs = await service.listPacks();

      expect(packs.length).toBe(5);
      const ids = packs.map((p) => p.id);
      expect(ids).toContain('builtin:default');
      expect(ids).toContain('builtin:solarized');
      expect(ids).toContain('builtin:nord');
      expect(ids).toContain('builtin:autumn');
      expect(ids).toContain('builtin:ocean');
    });

    it('빌트인 id에 "builtin:" prefix가 강제되어야 한다', async () => {
      const service = createThemePackService();
      const packs = await service.listPacks();
      const builtinPacks = packs.filter((p) => p.source === 'builtin');
      for (const pack of builtinPacks) {
        expect(pack.id).toMatch(/^builtin:/);
      }
    });

    it('user JSON 추가 → list에 추가되어야 한다', async () => {
      vi.mocked(fsMock.readdir).mockResolvedValue(['foo.json'] as ReturnType<typeof vi.fn>);
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(VALID_PACK_JSON));
      vi.mocked(fsMock.lstat).mockResolvedValue({ isSymbolicLink: () => false } as ReturnType<typeof vi.fn>);

      const service = createThemePackService();
      const packs = await service.listPacks();

      const userPack = packs.find((p) => p.id === 'foo');
      expect(userPack).toBeDefined();
      expect(userPack?.source).toBe('user');
    });

    it('symlink → 거부하고 나머지는 반환해야 한다', async () => {
      vi.mocked(fsMock.readdir).mockResolvedValue(['symlink.json'] as ReturnType<typeof vi.fn>);
      vi.mocked(fsMock.lstat).mockResolvedValue({ isSymbolicLink: () => true } as ReturnType<typeof vi.fn>);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = createThemePackService();
      const packs = await service.listPacks();

      // symlink는 거부, 빌트인만 남아야 함
      expect(packs.find((p) => p.id === 'symlink')).toBeUndefined();
      expect(packs.filter((p) => p.source === 'builtin')).toHaveLength(5);
      consoleWarnSpy.mockRestore();
    });

    it('잘못된 JSON → skip + warn (부팅 차단 0)', async () => {
      vi.mocked(fsMock.readdir).mockResolvedValue(['broken.json'] as ReturnType<typeof vi.fn>);
      vi.mocked(fsMock.readFile).mockResolvedValue('{ invalid json ');
      vi.mocked(fsMock.lstat).mockResolvedValue({ isSymbolicLink: () => false } as ReturnType<typeof vi.fn>);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = createThemePackService();
      const packs = await service.listPacks();

      // 깨진 파일은 스킵, 빌트인만 반환
      expect(packs.find((p) => p.id === 'broken')).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getPack', () => {
    it('builtin:default → ThemePack 반환해야 한다', async () => {
      const service = createThemePackService();
      const pack = await service.getPack('builtin:default');
      expect(pack).not.toBeNull();
      expect(pack?.id).toBe('builtin:default');
    });

    it('존재하지 않는 id → null 반환해야 한다', async () => {
      const service = createThemePackService();
      const pack = await service.getPack('nonexistent');
      expect(pack).toBeNull();
    });
  });

  describe('getThemesDir', () => {
    it('userData/themes 경로를 반환해야 한다', () => {
      const service = createThemePackService();
      expect(service.getThemesDir()).toBe(themesDir);
    });
  });

  describe('ensureThemesDir', () => {
    it('themes 디렉토리를 생성해야 한다', async () => {
      const service = createThemePackService();
      await service.ensureThemesDir();
      expect(fsMock.mkdir).toHaveBeenCalledWith(themesDir, { recursive: true });
    });
  });

  describe('revealFolder', () => {
    it('ensureThemesDir 후 showItemInFolder를 호출해야 한다', async () => {
      const service = createThemePackService();
      await service.revealFolder();
      expect(electronShell.showItemInFolder).toHaveBeenCalledWith(themesDir);
    });
  });
});
