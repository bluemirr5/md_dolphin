# md_dolphin

> A clean, distraction-free Markdown viewer for macOS.

[한국어 README](README.ko.md)

---

md_dolphin lets you open any `.md` file with a single click — no editor bloat, no setup, no cloud. Just the content, rendered beautifully.

**Features**

- Instant rendering of GitHub-flavored Markdown
- Minimal UI optimized for reading, not editing
- File association: `.md` files open directly in md_dolphin
- 5 built-in themes with light and dark variants, synced with macOS system appearance
- Custom themes via a simple JSON file
- Works entirely offline — no account, no telemetry
- Universal binary — runs natively on Apple Silicon and Intel

---

## Themes

md_dolphin ships with five built-in themes, each designed for comfortable sustained reading. Every theme has a light and a dark variant that switches automatically with your macOS system appearance.

| Theme | Character |
|---|---|
| **Default** | Clean and modern — warm neutrals with gentle contrast |
| **Solarized** | The classic. Warm cream light, deep teal dark |
| **Nord** | Arctic cool — muted blues and soft greys |
| **Ocean** | Crisp blues with cyan accents |
| **Autumn** | Rich ochre and amber for warm-tone lovers |

Switch themes anytime from the menu bar: **View → Theme**.

### Custom Themes

You can create your own theme without touching any code.

1. Write a JSON file with `light` and `dark` color maps (21 tokens).
2. Drop it into `~/Library/Application Support/md-dolphin/themes/`.
3. Reload the list via **View → Theme → Refresh Themes**.

<details>
<summary>Theme JSON skeleton</summary>

```json
{
  "name": "My Theme",
  "light": {
    "color.bg": "#FAFAFA",
    "color.text": "#1A1A1A"
  },
  "dark": {
    "color.bg": "#1A1A1A",
    "color.text": "#E0E0E0"
  },
  "shiki": { "light": "github-light", "dark": "github-dark" }
}
```

Full token list: [`docs/themes.md`](docs/themes.md)
</details>

> **Tip:** Paste the token list into any AI and ask it to generate a color scheme from a palette or mood — it works surprisingly well.

---

## Installation

md_dolphin is distributed via a custom Homebrew tap.

```bash
brew tap bluemirr5/md-dolphin
brew install --cask md-dolphin
```

That's it. md_dolphin will appear in `/Applications`.

---

## First Launch — Gatekeeper

md_dolphin is currently unsigned (not enrolled in the Apple Developer Program). macOS will block the first launch. This is a one-time step.

**Option A — Terminal (fastest)**

```bash
xattr -dr com.apple.quarantine "/Applications/MD Dolphin.app"
```

Then double-click **MD Dolphin** normally.

**Option B — Finder**

1. Open **Finder** → **Applications**.
2. Right-click (or Control-click) `MD Dolphin.app`.
3. Select **Open** from the context menu.
4. Click **Open** in the security dialog that appears.

After either step, md_dolphin launches normally from now on.

> **Why does this happen?**  
> macOS Gatekeeper requires apps to be signed with an Apple Developer ID. md_dolphin is open-source and independently developed — enrollment in the Apple Developer Program is planned for a future release. This warning is about the distribution method, not the safety of the app.

---

## System Requirements

- macOS 12 Monterey or later
- Apple Silicon or Intel

---

## License

[MIT](LICENSE)

---

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md).
