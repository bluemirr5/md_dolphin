// i18n/index.ts — renderer 전용 i18next 초기화
// 설계 제약:
// - resources는 정적 import만 — 동적 fetch/eval 금지 (CSP 정합)
// - renderer만 i18next 풀 인스턴스 사용 (main은 src/shared/i18n-lookup.ts)
// - lng는 window.api.getLocale() 결과를 ko/en으로 정규화
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import koJson from '../../../shared/locales/ko.json';
import enJson from '../../../shared/locales/en.json';

/** 지원하는 locale 목록 */
const SUPPORTED_LOCALES = ['ko', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * 시스템 locale 문자열을 ko/en 중 하나로 정규화한다.
 * ko, ko-KR → ko
 * 그 외 (en, en-US, pt-BR, ja, ...) → en (fallback)
 *
 * export: 테스트 직접 호출용
 */
export function normalizeLocale(rawLocale: string): SupportedLocale {
  const lang = rawLocale.split('-')[0]?.toLowerCase() ?? '';
  if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
    return lang as SupportedLocale;
  }
  return 'en';
}

/**
 * i18next 인스턴스를 생성하고 초기화한다.
 * 테스트에서 직접 호출 가능 (locale 주입 지원).
 */
export async function createI18nInstance(rawLocale: string): Promise<i18n> {
  const lng = normalizeLocale(rawLocale);
  const instance = i18next.createInstance();

  await instance
    .use(initReactI18next)
    .init({
      resources: {
        ko: { translation: koJson },
        en: { translation: enJson },
      },
      lng,
      fallbackLng: 'en',
      interpolation: {
        // React가 이미 escape하므로 이중 escape 불필요 (설계 제약)
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  return instance;
}

/**
 * renderer 앱 전역 i18next 인스턴스.
 * main.tsx에서 `await initI18n()` 호출 후 I18nextProvider에 전달.
 */
let _i18nInstance: i18n | null = null;

export async function initI18n(): Promise<i18n> {
  // window.api.getLocale()이 존재하면 시스템 locale 사용, 없으면 navigator.language fallback
  let rawLocale = 'en';
  type WindowWithApi = Window & { api?: { getLocale?: (() => Promise<string>) | undefined } };
  if (typeof window !== 'undefined' && typeof (window as WindowWithApi).api?.getLocale === 'function') {
    try {
      rawLocale = await ((window as WindowWithApi).api as { getLocale: () => Promise<string> }).getLocale();
    } catch {
      rawLocale = (typeof navigator !== 'undefined' ? navigator.language : null) ?? 'en';
    }
  } else if (typeof navigator !== 'undefined') {
    rawLocale = navigator.language ?? 'en';
  }

  _i18nInstance = await createI18nInstance(rawLocale);
  return _i18nInstance;
}

export function getI18nInstance(): i18n {
  if (!_i18nInstance) {
    throw new Error('[i18n] initI18n() must be called before getI18nInstance()');
  }
  return _i18nInstance;
}
