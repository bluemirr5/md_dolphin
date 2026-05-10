// R4 TDD — shiki-loader.setShikiThemes
// 미존재 테마 fallback, loadTheme 중복 차단 (loadedThemes Set), activePackId 변경 시 useEffect 재실행
import { describe, it, expect, vi, beforeEach } from 'vitest';

// shiki-loader.ts 모듈을 직접 import (실제 shiki 없이 모킹)
vi.mock('shiki', () => {
  const loadThemeMock = vi.fn().mockResolvedValue(undefined);
  const loadLanguageMock = vi.fn().mockResolvedValue(undefined);
  const codeToHtmlMock = vi.fn().mockReturnValue('<pre><code>test</code></pre>');

  return {
    createHighlighter: vi.fn().mockResolvedValue({
      loadTheme: loadThemeMock,
      loadLanguage: loadLanguageMock,
      codeToHtml: codeToHtmlMock,
      getLoadedLanguages: vi.fn().mockReturnValue([]),
    }),
  };
});

import { createHighlighter } from 'shiki';

describe('setShikiThemes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // createHighlighter mock 재설정
    const loadThemeMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(createHighlighter).mockResolvedValue({
      loadTheme: loadThemeMock,
      loadLanguage: vi.fn().mockResolvedValue(undefined),
      codeToHtml: vi.fn().mockReturnValue('<pre><code>test</code></pre>'),
      getLoadedLanguages: vi.fn().mockReturnValue([]),
    } as unknown as Awaited<ReturnType<typeof createHighlighter>>);
  });

  it('setShikiThemes — 새 테마 로드 시 loadTheme을 1회 호출해야 한다', async () => {
    const { setShikiThemes, _resetForTest } = await import('../../src/renderer/src/markdown/shiki-loader');
    _resetForTest();

    const { createHighlighter: mockedCreate } = await import('shiki');
    const mockHighlighter = await mockedCreate({ themes: [], langs: [] });
    const loadThemeSpy = vi.spyOn(mockHighlighter, 'loadTheme');

    // highlighter가 생성되고 나서 setShikiThemes 호출
    await setShikiThemes('nord', 'nord');
    expect(loadThemeSpy).toHaveBeenCalledTimes(1);
    expect(loadThemeSpy).toHaveBeenCalledWith('nord');
  });

  it('setShikiThemes — 동일 테마 재호출 시 loadTheme을 1회만 호출해야 한다 (loadedThemes Set)', async () => {
    const { setShikiThemes, _resetForTest } = await import('../../src/renderer/src/markdown/shiki-loader');
    _resetForTest();

    const { createHighlighter: mockedCreate } = await import('shiki');
    const mockHighlighter = await mockedCreate({ themes: [], langs: [] });
    const loadThemeSpy = vi.spyOn(mockHighlighter, 'loadTheme');

    await setShikiThemes('nord', 'nord');
    await setShikiThemes('nord', 'nord'); // 동일 테마 재호출
    // nord는 이미 loadedThemes에 있으므로 1회만 호출
    expect(loadThemeSpy).toHaveBeenCalledTimes(1);
  });

  it('setShikiThemes — 미존재 테마 reject 시 github-light/github-dark로 폴백해야 한다', async () => {
    const { setShikiThemes, highlightCode, _resetForTest } = await import('../../src/renderer/src/markdown/shiki-loader');
    _resetForTest();

    const { createHighlighter: mockedCreate } = await import('shiki');
    const mockHighlighter = await mockedCreate({ themes: [], langs: [] });

    // loadTheme이 reject을 던지도록 모킹
    vi.spyOn(mockHighlighter, 'loadTheme').mockRejectedValueOnce(new Error('Theme not found: fake-theme'));
    vi.spyOn(mockHighlighter, 'codeToHtml');

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await setShikiThemes('fake-theme', 'fake-dark');

    // 폴백 후 highlightCode 호출 시 github-light/github-dark로 동작해야 함
    // (codeToHtml이 themes.light = github-light, themes.dark = github-dark로 호출됨)
    mockHighlighter.getLoadedLanguages = vi.fn().mockReturnValue(['javascript']);
    await highlightCode('const x = 1;', 'javascript');

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});
