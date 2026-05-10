// theme-pack-service.ts — 빌트인 + 사용자 테마 팩 디스커버리 (사이클 12 P12-2)
// 빌트인은 정적 import, 사용자 팩은 userData/themes/*.json 매번 디스크 read
// symlink는 lstat으로 거부, JSON 깨진 파일 skip + warn (앱 부팅 차단 0)
// builtin id는 'builtin:' prefix 강제로 user id와 충돌 0
import { app, shell } from 'electron';
import { promises as fs } from 'node:fs';
import { join, extname, basename } from 'node:path';
import type { ThemePack } from '@shared/theme-spec';
import { validateThemePack } from '@shared/theme-validate';

// 빌트인 팩 정적 import (asar 자동 포함)
import defaultJson from '@shared/built-in-themes/default.json';
import solarizedJson from '@shared/built-in-themes/solarized.json';
import nordJson from '@shared/built-in-themes/nord.json';
import oceanJson from '@shared/built-in-themes/ocean.json';
import autumnJson from '@shared/built-in-themes/autumn.json';

// 빌트인 팩을 ThemePack으로 변환
function makeBuiltinPack(id: string, json: typeof defaultJson): ThemePack {
  return {
    id: `builtin:${id}`,
    name: json.name,
    source: 'builtin',
    light: json.light,
    dark: json.dark,
    shiki: json.shiki,
  };
}

const BUILTIN_PACKS: readonly ThemePack[] = [
  makeBuiltinPack('default', defaultJson),
  makeBuiltinPack('solarized', solarizedJson),
  makeBuiltinPack('nord', nordJson),
  makeBuiltinPack('ocean', oceanJson),
  makeBuiltinPack('autumn', autumnJson),
];

// 빌트인 폴백 (validateThemePack 호출 시 기본값으로 사용)
// light/dark 분리 — 사용자 JSON의 dark 섹션 오염 시 dark fallback으로 폴백 (CR12-W1)
const DEFAULT_LIGHT_FALLBACK = BUILTIN_PACKS[0]!.light;
const DEFAULT_DARK_FALLBACK = BUILTIN_PACKS[0]!.dark;

export interface ThemePackService {
  /** 빌트인 + 사용자 팩 목록을 반환한다. 매번 디스크 read (캐시 X). */
  listPacks(): Promise<readonly ThemePack[]>;
  /** id로 팩을 조회한다. 없으면 null. */
  getPack(id: string): Promise<ThemePack | null>;
  /** userData/themes 디렉토리 경로를 반환한다. */
  getThemesDir(): string;
  /** themes 디렉토리가 없으면 생성한다. */
  ensureThemesDir(): Promise<void>;
  /** themes 디렉토리를 Finder에서 열고 자동 생성한다. */
  revealFolder(): Promise<void>;
}

export function createThemePackService(): ThemePackService {
  const themesDir = join(app.getPath('userData'), 'themes');

  async function loadUserPacks(): Promise<ThemePack[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(themesDir);
    } catch {
      // 디렉토리 없음 — 사용자 팩 0건 (오류 아님)
      return [];
    }

    const packs: ThemePack[] = [];

    for (const entry of entries) {
      if (extname(entry).toLowerCase() !== '.json') continue;

      const filePath = join(themesDir, entry);

      // symlink 거부 (보안)
      try {
        const stat = await fs.lstat(filePath);
        if (stat.isSymbolicLink()) {
          console.warn(`[theme-pack] symlink 거부: ${filePath}`);
          continue;
        }
      } catch (err) {
        console.warn(`[theme-pack] lstat 실패: ${filePath}`, err);
        continue;
      }

      // JSON 읽기 + 파싱
      let rawJson: unknown;
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        rawJson = JSON.parse(content) as unknown;
      } catch (err) {
        console.warn(`[theme-pack] JSON 파싱 실패 (skip): ${filePath}`, err);
        continue;
      }

      // 스키마 + 색상 검증
      try {
        const stem = basename(entry, '.json');
        const raw = rawJson as Record<string, unknown>;
        const withId = { ...raw, id: stem, source: 'user' as const };
        const { pack } = validateThemePack(withId, DEFAULT_LIGHT_FALLBACK, DEFAULT_DARK_FALLBACK);
        // id와 source는 파일명 기반으로 강제 주입
        const userPack: ThemePack = {
          ...pack,
          id: stem,
          source: 'user',
        };
        packs.push(userPack);
      } catch (err) {
        console.warn(`[theme-pack] 팩 schema 깨짐 (skip): ${filePath}`, err);
        continue;
      }
    }

    return packs;
  }

  return {
    async listPacks(): Promise<readonly ThemePack[]> {
      const userPacks = await loadUserPacks();
      return [...BUILTIN_PACKS, ...userPacks];
    },

    async getPack(id: string): Promise<ThemePack | null> {
      const allPacks = await this.listPacks();
      return allPacks.find((p) => p.id === id) ?? null;
    },

    getThemesDir(): string {
      return themesDir;
    },

    async ensureThemesDir(): Promise<void> {
      await fs.mkdir(themesDir, { recursive: true });
    },

    async revealFolder(): Promise<void> {
      await this.ensureThemesDir();
      shell.showItemInFolder(themesDir);
    },
  };
}
