// recent-files-store — 최근 연 파일 목록 (localStorage 영속화)
// 모듈 최상위 싱글턴 — 앱 전역 단일 인스턴스 (sidebar-store 패턴 동일)
// 첫 화면 WelcomeScreen에서 빠르게 재오픈할 수 있도록 path + openedAt 보관
import { create } from 'zustand';

const STORAGE_KEY = 'mddolphin.recent.files';
const MAX_FILES = 8;

export interface RecentFile {
  readonly path: string;
  readonly openedAt: number;
}

interface RecentFilesState {
  readonly files: readonly RecentFile[];
  readonly push: (path: string) => void;
  readonly remove: (path: string) => void;
  readonly clear: () => void;
}

function isRecentFile(value: unknown): value is RecentFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.path === 'string' && typeof v.openedAt === 'number';
}

function readInitial(): readonly RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentFile).slice(0, MAX_FILES);
  } catch (e) {
    console.warn('[recent-files-store] localStorage 읽기 실패', e);
    return [];
  }
}

function persist(files: readonly RecentFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.warn('[recent-files-store] localStorage 쓰기 실패', e);
  }
}

const recentFilesStore = create<RecentFilesState>((set) => ({
  files: readInitial(),
  push: (path: string) => {
    set((state) => {
      const filtered = state.files.filter((f) => f.path !== path);
      const next: RecentFile[] = [{ path, openedAt: Date.now() }, ...filtered].slice(0, MAX_FILES);
      persist(next);
      return { files: next };
    });
  },
  remove: (path: string) => {
    set((state) => {
      const next = state.files.filter((f) => f.path !== path);
      persist(next);
      return { files: next };
    });
  },
  clear: () => {
    persist([]);
    set({ files: [] });
  },
}));

export function useRecentFiles(): readonly RecentFile[] {
  return recentFilesStore((s) => s.files);
}

export function useRecentFilesPush(): (path: string) => void {
  return recentFilesStore((s) => s.push);
}

export function useRecentFilesRemove(): (path: string) => void {
  return recentFilesStore((s) => s.remove);
}

export { recentFilesStore };
