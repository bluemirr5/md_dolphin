// UpdateBanner.tsx — Homebrew 배포 기반 업데이트 알림 UI
// 주 CTA: brew 명령어 복사 / 보조: 릴리즈 노트 보기 / 닫기
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UpdateBanner } from '../../src/renderer/src/components/UpdateBanner';

afterEach(() => { cleanup(); });

const mockOpenReleases = vi.fn();
const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: { openReleases: mockOpenReleases },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockClipboardWrite },
    configurable: true,
    writable: true,
  });
});

describe('UpdateBanner — 렌더링', () => {
  it('버전 문자열이 화면에 표시된다', () => {
    render(<UpdateBanner version="1.2.3" onDismiss={() => {}} />);
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
  });

  it('brew 명령어가 화면에 표시된다', () => {
    render(<UpdateBanner version="1.0.0" onDismiss={() => {}} />);
    expect(screen.getByText(/brew upgrade --cask md-dolphin/)).toBeInTheDocument();
  });

  it('Copy 버튼이 존재한다', () => {
    render(<UpdateBanner version="1.0.0" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('릴리즈 노트 버튼이 존재한다', () => {
    render(<UpdateBanner version="1.0.0" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: /notes|release/i })).toBeInTheDocument();
  });

  it('닫기 버튼이 존재한다', () => {
    render(<UpdateBanner version="1.0.0" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });
});

describe('UpdateBanner — 인터랙션', () => {
  it('Copy 클릭 → clipboard에 brew 명령어 복사', () => {
    render(<UpdateBanner version="1.2.3" onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(mockClipboardWrite).toHaveBeenCalledWith('brew upgrade --cask md-dolphin');
  });

  it('Notes 클릭 → window.api.openReleases() 호출', () => {
    render(<UpdateBanner version="1.2.3" onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /notes|release/i }));
    expect(mockOpenReleases).toHaveBeenCalledOnce();
  });

  it('닫기 버튼 클릭 → onDismiss() 호출 (AC3)', () => {
    const onDismiss = vi.fn();
    render(<UpdateBanner version="1.2.3" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
