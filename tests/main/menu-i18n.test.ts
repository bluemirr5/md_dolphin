// menu-i18n.test.ts — 사후: i18n-lookup helper 단위 테스트
// AC5: ko locale에서 메뉴 라벨이 '파일'/'편집'/... en에서 'File'/'Edit'/...
import { describe, it, expect } from 'vitest';
import { lookup, normalizeMainLocale } from '../../src/shared/i18n-lookup';

describe('normalizeMainLocale', () => {
  it('ko → ko', () => {
    expect(normalizeMainLocale('ko')).toBe('ko');
  });

  it('ko-KR → ko', () => {
    expect(normalizeMainLocale('ko-KR')).toBe('ko');
  });

  it('en → en', () => {
    expect(normalizeMainLocale('en')).toBe('en');
  });

  it('en-US → en', () => {
    expect(normalizeMainLocale('en-US')).toBe('en');
  });

  it('ja → en (fallback)', () => {
    expect(normalizeMainLocale('ja')).toBe('en');
  });

  it('pt-BR → en (fallback)', () => {
    expect(normalizeMainLocale('pt-BR')).toBe('en');
  });
});

describe('lookup — ko locale', () => {
  it('menu.file.label = 파일', () => {
    expect(lookup('ko', 'menu.file.label')).toBe('파일');
  });

  it('menu.edit.label = 편집', () => {
    expect(lookup('ko', 'menu.edit.label')).toBe('편집');
  });

  it('menu.view.label = 보기', () => {
    expect(lookup('ko', 'menu.view.label')).toBe('보기');
  });

  it('menu.window.label = 윈도우', () => {
    expect(lookup('ko', 'menu.window.label')).toBe('윈도우');
  });

  it('menu.file.open = 파일 열기...', () => {
    expect(lookup('ko', 'menu.file.open')).toBe('파일 열기...');
  });

  it('menu.file.print = 인쇄...', () => {
    expect(lookup('ko', 'menu.file.print')).toBe('인쇄...');
  });
});

describe('lookup — en locale', () => {
  it('menu.file.label = File', () => {
    expect(lookup('en', 'menu.file.label')).toBe('File');
  });

  it('menu.edit.label = Edit', () => {
    expect(lookup('en', 'menu.edit.label')).toBe('Edit');
  });

  it('menu.view.label = View', () => {
    expect(lookup('en', 'menu.view.label')).toBe('View');
  });

  it('menu.window.label = Window', () => {
    expect(lookup('en', 'menu.window.label')).toBe('Window');
  });

  it('menu.file.open = Open...', () => {
    expect(lookup('en', 'menu.file.open')).toBe('Open...');
  });
});

describe('lookup — fallback 동작', () => {
  it('미존재 키 → 키 원문 반환', () => {
    expect(lookup('ko', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('ko locale에서 미존재 키 → en fallback 후 원문 반환', () => {
    expect(lookup('ko', 'completely.unknown.key')).toBe('completely.unknown.key');
  });

  it('pt-BR locale → en fallback으로 영어 메시지', () => {
    expect(lookup('pt-BR', 'menu.file.label')).toBe('File');
  });
});
