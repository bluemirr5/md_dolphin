// theme-service — nativeTheme 기반 테마 resolve 및 변경 감지
// 설계 제약:
// - nativeTheme listener는 app 수명 단위 단일 등록 (윈도우 단위 등록 금지)
// - getCurrentTheme()은 resolved 결과('light' | 'dark')만 반환 (P4-7)
// - watchTheme(send) dispose는 main ipc-handlers에서 app quit 시 호출
import { nativeTheme } from 'electron';
import type { RenderingTheme, ThemeUpdatePayload } from '@shared/theme-types';

/**
 * 현재 시스템 테마를 반환한다.
 * nativeTheme.shouldUseDarkColors true → 'dark', false → 'light'
 */
export function getCurrentTheme(): RenderingTheme {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * nativeTheme.updated 이벤트를 구독하고, 변경 시 send 콜백을 호출한다.
 * 반환된 dispose 함수를 호출하면 리스너가 제거된다.
 */
export function watchTheme(send: (payload: ThemeUpdatePayload) => void): () => void {
  function handleUpdated() {
    const theme = getCurrentTheme();
    send({ theme, source: 'native' });
  }

  nativeTheme.on('updated', handleUpdated);

  return () => {
    nativeTheme.off('updated', handleUpdated);
  };
}
