// process.platform 분기를 한 곳에 격리하기 위한 헬퍼. 마스터 플랜 0.3 가이드.
// 사이클 1에서는 isMacOS만. 사이클 3~9에서 필요 시 확장.

export function isMacOS(): boolean {
  return process.platform === 'darwin';
}
