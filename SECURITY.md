# Security Policy

## Reporting a Vulnerability

To report a security vulnerability, email **bluemirr5@gmail.com** with:

- A description of the issue and potential impact
- Steps to reproduce or a proof-of-concept (if applicable)
- Affected version(s)

Please do not open a public GitHub Issue for security vulnerabilities.

## Response SLA

This project is maintained on a **best effort** basis. We aim to acknowledge reports
within 7 days and provide an initial assessment within 14 days. There is no guaranteed
remediation timeline.

## Known Limitations — Unsigned DMG (Decision 6)

md_dolphin is distributed as an **unsigned DMG** in Phase 1. Implications:

- The binary is not notarized by Apple. macOS Gatekeeper will block the first launch.
- Users must follow the right-click → Open workaround described in [README.md](README.md#gatekeeper-bypass).
- We cannot guarantee the integrity of third-party mirrors or re-distributions.
  Always download from the official [GitHub Releases](https://github.com/bluemirr5/md_dolphin/releases)
  and verify the SHA256 checksum against `SHA256SUMS.txt`.

Phase 2 will introduce notarization via Apple Developer Program enrollment, removing this limitation.

## CVE Policy

<!-- TODO: Define CVE handling policy when the project has active users and a disclosure process -->

At this stage the project does not have a formal CVE assignment process.
Critical vulnerabilities will be addressed in a new release with a security advisory on GitHub.

## Scope

md_dolphin is a **local-file, read-only** Markdown viewer. The attack surface is limited to:

- Malicious `.md` files opened by the user (mitigated by DOMPurify sanitization and `html: false` markdown-it option)
- IPC between Electron main and renderer (CSP `default-src 'none'` enforced, contextIsolation enabled)

Features outside scope: network requests, remote content, cloud sync.
