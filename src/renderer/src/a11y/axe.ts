// axe.ts — dev 환경 axe-core/react 통합 (production 빌드에서 미포함)
// 설계 제약:
// - 동적 import + NODE_ENV 가드 → production tree-shake 보장
// - App mount 후 1000ms 지연으로 초기 렌더 완료 후 분석
import type React from 'react';

/**
 * axe-core를 dev 환경에서만 초기화한다.
 * production 빌드에서는 동적 import가 dead code로 제거됨.
 * scripts/verify-prod-bundle.mjs가 dist/에서 'axe-core' 문자열 없음을 검증.
 *
 * @param react React 인스턴스
 * @param reactDom ReactDOM 인스턴스 (any — axe-core 타입과 react-dom 버전 불일치 허용)
 */
export async function initAxe(
  react: typeof React,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reactDom: any,
): Promise<void> {
  if (!import.meta.env.DEV) return;

  try {
    const axe = await import('@axe-core/react');
    await axe.default(react, reactDom, 1000);
  } catch (err) {
    console.warn('[axe] axe-core/react 초기화 실패:', err);
  }
}
