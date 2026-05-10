// process.platform 분기를 한 곳에 격리하기 위한 헬퍼. 마스터 플랜 0.3 가이드.
// darwin 전용 호출은 onMacOS()를 통과해야 한다 (설계 제약).

export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * macOS(darwin)에서만 fn을 실행한다.
 * non-darwin이면 fn을 호출하지 않고 undefined를 반환한다.
 *
 * 사용 예:
 *   onMacOS(() => app.on('open-file', handler));
 */
export function onMacOS<T>(fn: () => T): T | undefined {
  if (isMacOS()) {
    return fn();
  }
  return undefined;
}
