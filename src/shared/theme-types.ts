// 테마 타입 — 렌더러·preload·main 공통 (resolve된 결과만)
// 설계 제약: RenderingTheme은 항상 'light' | 'dark' resolved 값
// 사용자 의도('auto' 포함)는 사이클 10에서 ThemeIntent = 'light' | 'dark' | 'auto' 도입 예정 (P4-7)

/** DOM에 실제 적용되는 테마 — 항상 resolved 결과 */
export type RenderingTheme = 'light' | 'dark';

/**
 * main → renderer 테마 갱신 페이로드.
 * source: 'native' — nativeTheme.updated 이벤트 기반
 * source: 'manual' — 사용자 override (사이클 10 활성화 예정, 타입만 정의)
 */
export interface ThemeUpdatePayload {
  readonly theme: RenderingTheme;
  readonly source: 'native' | 'manual';
}
