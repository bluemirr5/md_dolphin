// TDD R1: theme-store — 초기값·setTheme 알림·멱등성 검증
// AC1: 초기 theme === 'light', setTheme('dark') 후 구독자 1회 알림, 동일 값 재set 시 추가 알림 없음
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 각 테스트마다 store 모듈을 fresh하게 임포트하기 위해 factory 패턴으로 테스트
// theme-store는 모듈 최상위 싱글턴이므로 각 테스트에서 getState()로 직접 검증
import { useThemeStore } from '../../src/renderer/src/store/theme-store';

beforeEach(() => {
  // 매 테스트 전에 store를 초기 상태로 리셋
  useThemeStore.setState({ theme: 'light' });
});

describe('useThemeStore — R1 (AC1)', () => {
  it('초기 theme은 light이다', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('light');
  });

  it('setTheme("dark") 후 theme이 dark로 변경된다', () => {
    const { setTheme } = useThemeStore.getState();
    setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme 후 구독자에게 1회 알림이 발생한다', () => {
    const listener = vi.fn();
    const unsub = useThemeStore.subscribe(listener);

    useThemeStore.getState().setTheme('dark');

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('동일한 값을 재set해도 구독자에게 추가 알림이 없다 (멱등성)', () => {
    useThemeStore.setState({ theme: 'dark' });

    const listener = vi.fn();
    const unsub = useThemeStore.subscribe(listener);

    useThemeStore.getState().setTheme('dark');

    // setTheme 내부 early return(if get().theme === theme)이 set() 호출 자체를 막으므로 알림 없음
    expect(listener).toHaveBeenCalledTimes(0);
    unsub();
  });

  it('light → dark → light 순서로 setTheme 시 각 변경마다 구독자 1회씩 알림', () => {
    const listener = vi.fn();
    const unsub = useThemeStore.subscribe(listener);

    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setTheme('light');

    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });
});
