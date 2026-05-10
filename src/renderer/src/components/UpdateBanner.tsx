const BREW_CMD = 'brew upgrade --cask md-dolphin';

interface Props {
  version: string;
  onDismiss: () => void;
}

export function UpdateBanner({ version, onDismiss }: Props): JSX.Element {
  function copyBrewCmd(): void {
    void navigator.clipboard.writeText(BREW_CMD);
  }

  return (
    <div role="status" className="update-banner">
      <span>v{version} available —</span>
      <code className="update-banner-cmd">{BREW_CMD}</code>
      <button onClick={copyBrewCmd} aria-label="Copy brew upgrade command">
        Copy
      </button>
      <button
        onClick={() => void window.api.openReleases()}
        aria-label="View release notes"
      >
        Notes
      </button>
      <button onClick={onDismiss} aria-label="Dismiss update notification">
        ×
      </button>
    </div>
  );
}
