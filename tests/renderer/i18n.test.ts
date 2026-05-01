// R2 TDD: i18next 초기화·locale 라우팅
// AC2: ko locale t('menu.file.open') = '파일 열기...', en = 'Open...'
//       pt-BR → en fallback, ko-KR → ko 매핑, 미존재 키 fallback
import { describe, it, expect, beforeEach } from 'vitest';

// i18n/index.ts가 window.api를 참조하지 않도록 모킹
// (renderer 환경에서 window.api.getLocale() 호출 → 테스트에서는 직접 함수 주입)
import {
  createI18nInstance,
  normalizeLocale,
} from '../../src/renderer/src/i18n/index';

describe('normalizeLocale — locale 정규화', () => {
  it('ko → ko', () => {
    expect(normalizeLocale('ko')).toBe('ko');
  });

  it('ko-KR → ko', () => {
    expect(normalizeLocale('ko-KR')).toBe('ko');
  });

  it('en → en', () => {
    expect(normalizeLocale('en')).toBe('en');
  });

  it('en-US → en', () => {
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('pt-BR → en (fallback)', () => {
    expect(normalizeLocale('pt-BR')).toBe('en');
  });

  it('ja → en (fallback)', () => {
    expect(normalizeLocale('ja')).toBe('en');
  });

  it('빈 문자열 → en (fallback)', () => {
    expect(normalizeLocale('')).toBe('en');
  });
});

describe('createI18nInstance — ko locale', () => {
  let t: (key: string) => string;

  beforeEach(async () => {
    const i18n = await createI18nInstance('ko');
    t = (key: string) => i18n.t(key);
  });

  it('menu.file.open = 파일 열기...', () => {
    expect(t('menu.file.open')).toBe('파일 열기...');
  });

  it('menu.file.label = 파일', () => {
    expect(t('menu.file.label')).toBe('파일');
  });

  it('menu.edit.label = 편집', () => {
    expect(t('menu.edit.label')).toBe('편집');
  });

  it('errors.permission = 한국어 에러 메시지', () => {
    const msg = t('errors.permission');
    expect(msg).toBeTruthy();
    expect(msg).not.toBe('errors.permission');
  });

  it('a11y.outline.empty = 목차가 없습니다.', () => {
    expect(t('a11y.outline.empty')).toBe('목차가 없습니다.');
  });
});

describe('createI18nInstance — en locale', () => {
  let t: (key: string) => string;

  beforeEach(async () => {
    const i18n = await createI18nInstance('en');
    t = (key: string) => i18n.t(key);
  });

  it('menu.file.open = Open...', () => {
    expect(t('menu.file.open')).toBe('Open...');
  });

  it('menu.file.label = File', () => {
    expect(t('menu.file.label')).toBe('File');
  });

  it('menu.edit.label = Edit', () => {
    expect(t('menu.edit.label')).toBe('Edit');
  });

  it('a11y.outline.empty = No outline available.', () => {
    expect(t('a11y.outline.empty')).toBe('No outline available.');
  });
});

describe('createI18nInstance — fallback 동작', () => {
  it('미존재 키는 키 문자열 그대로 반환', async () => {
    const i18n = await createI18nInstance('en');
    const result = i18n.t('foo.bar');
    expect(result).toBe('foo.bar');
  });

  it('pt-BR → en fallback으로 영어 메시지 반환', async () => {
    const i18n = await createI18nInstance('pt-BR');
    // pt-BR은 en fallback
    expect(i18n.t('menu.file.open')).toBe('Open...');
  });

  it('ko-KR → ko locale 매핑으로 한국어 메시지 반환', async () => {
    const i18n = await createI18nInstance('ko-KR');
    expect(i18n.t('menu.file.open')).toBe('파일 열기...');
  });
});
