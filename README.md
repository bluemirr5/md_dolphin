# md_dolphin

A macOS markdown viewer built with Electron — lightweight, local-first, designed for non-developers.

[한국어 README](README.ko.md)

---

## Overview

md_dolphin opens `.md` files with a clean reading experience on macOS. It is Electron-based (Decision 1), which means it carries a larger footprint than native apps but runs reliably on macOS 12 and later without additional runtime dependencies (Decision 12).

---

## Installation

### Option 1 — Direct DMG download

1. Go to [GitHub Releases](https://github.com/bluemirr5/md_dolphin/releases).
2. Download `md_dolphin-<version>-mac-universal.dmg`.
3. Open the DMG and drag `md_dolphin.app` to `/Applications`.
4. Follow the [Gatekeeper bypass guide](#gatekeeper-bypass) below for first launch.

### Option 2 — Homebrew Cask

> Note: The Cask is hosted in a custom tap (`bluemirr5/homebrew-md-dolphin`), not the official `homebrew/cask`. Public submission will be reviewed after notarization (Phase 2).

```bash
brew tap bluemirr5/md-dolphin
brew install --cask md-dolphin
```

After installation, follow the [Gatekeeper bypass guide](#gatekeeper-bypass) below for first launch.

---

## Gatekeeper Bypass <a name="gatekeeper-bypass"></a>

md_dolphin is distributed without an Apple code signature (Decision 6 — Apple Developer Program not yet enrolled). macOS Gatekeeper will block the first launch. Follow these steps:

<!-- TODO: v0.11.1 빌드 후 캡처 → docs/screenshots/install/01-download.png 등 5장 추가 -->

**Step 1 — Download the DMG**

Download from [GitHub Releases](https://github.com/bluemirr5/md_dolphin/releases).

*Screenshot placeholder: `docs/screenshots/install/01-download.png`*

**Step 2 — Mount the DMG**

Double-click the downloaded `.dmg` file to mount it.

*Screenshot placeholder: `docs/screenshots/install/02-mount.png`*

**Step 3 — Drag to Applications**

Drag `md_dolphin.app` into the `/Applications` shortcut inside the DMG window.

*Screenshot placeholder: `docs/screenshots/install/03-drag.png`*

**Step 4 — Right-click to Open**

In Finder, navigate to `/Applications`, right-click (or Control-click) `md_dolphin.app`, and select **Open** from the context menu.

*Screenshot placeholder: `docs/screenshots/install/04-rightclick.png`*

**Step 5 — Confirm the Dialog**

A dialog will appear warning that the app is from an unidentified developer. Click **Open** to confirm.

*Screenshot placeholder: `docs/screenshots/install/05-confirm.png`*

After this one-time step, md_dolphin will open normally on subsequent launches.

---

## Bundle Size and Memory

> About 130 MB download, approximately 200 MB memory on Apple Silicon Mac. This is larger than typical macOS apps because md_dolphin is Electron-based. (Decision 12)

We document this honestly so users can make an informed choice. A native macOS build is planned as a future exploration — see [Phase 2 checklist](docs/release/phase2-checklist.md) for the roadmap.

---

## Why Is This Guide Necessary?

md_dolphin is currently not enrolled in the Apple Developer Program (USD 99/year). Without a paid Developer ID certificate, macOS Gatekeeper blocks apps from running via double-click.

**What this means for you:**

- First launch requires the right-click → Open workaround described above.
- You may see a warning like "Apple could not verify this app."
- This is a distribution limitation, not a security issue with the app itself.

We plan to enroll in the Apple Developer Program and notarize the app in Phase 2. Once notarized, double-click launch will work normally and this guide will be updated.

---

## SHA256 Verification

To verify the integrity of your download:

```bash
shasum -a 256 -c SHA256SUMS.txt
```

The `SHA256SUMS.txt` file is attached to each GitHub Release alongside the DMG.

---

## License

[MIT](LICENSE)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Security

See [SECURITY.md](SECURITY.md) for vulnerability disclosure information.

---

*Screenshots captured on macOS 14 Sonoma.*
