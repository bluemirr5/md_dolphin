// i18n-lookup.ts — main 프로세스 전용 dot-path lookup helper
// 설계 제약:
// - main은 i18next 풀 인스턴스 불필요 (5~10키만 사용)
// - 정적 require로 locales JSON 로드 (eval 회피)
// - 미존재 키는 en fallback → key 원문 반환
import koJson from './locales/ko.json';
import enJson from './locales/en.json';

type LocaleResources = Record<string, unknown>;

const resources: Record<string, LocaleResources> = {
  ko: koJson,
  en: enJson,
};

const SUPPORTED_LOCALES = ['ko', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * 시스템 locale을 ko/en으로 정규화한다.
 * ko, ko-KR → ko; 그 외 → en
 */
export function normalizeMainLocale(rawLocale: string): SupportedLocale {
  const lang = rawLocale.split('-')[0]?.toLowerCase() ?? '';
  if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
    return lang as SupportedLocale;
  }
  return 'en';
}

/**
 * dot-path로 locale JSON에서 값을 조회한다.
 *
 * @example
 * lookup('ko', 'menu.file.open') // '파일 열기...'
 * lookup('en', 'menu.file.open') // 'Open...'
 * lookup('ko', 'nonexistent.key') // 'nonexistent.key'
 */
export function lookup(locale: string, key: string): string {
  const normalizedLocale = normalizeMainLocale(locale);
  const result = resolveKey(resources[normalizedLocale], key);
  if (result !== null) return result;

  // en fallback
  const fallback = resolveKey(resources['en'], key);
  if (fallback !== null) return fallback;

  // 키 원문 반환
  return key;
}

function resolveKey(obj: LocaleResources | undefined, key: string): string | null {
  if (!obj) return null;
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : null;
}
