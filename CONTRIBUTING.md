# Contributing to md_dolphin

Thank you for your interest in contributing.

## Development Setup

```bash
# Install dependencies
pnpm install

# Start development server (Electron + Vite HMR)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Branch Strategy

- `main` — stable, release-ready
- `feature/<short-description>` — feature development

Work on a `feature/` branch and open a PR against `main`.

## Pull Request Checklist

Before opening a PR, verify:

- [ ] `pnpm typecheck` passes (no TypeScript errors)
- [ ] `pnpm lint` passes (no lint errors)
- [ ] `pnpm test` passes (all tests green)
- [ ] Changes are consistent with `docs/plans/` (master plan decisions not violated)
- [ ] New files follow existing project conventions (see `src/` structure)

## Commit Messages

- Korean commit messages are welcome (한국어 커밋 메시지 OK)
- English is also fine
- Format: `<scope>: <summary>` (e.g., `renderer: add TOC sidebar`)
- Keep the first line under 72 characters

## Code Style

- TypeScript strict mode — no `any` without justification
- ESLint config: `eslint.config.js`
- Formatting: Prettier (run `pnpm format`)

## Architecture

See `docs/plans/README.md` for the master plan index and decision log.

## Reporting Issues

Open a [GitHub Issue](https://github.com/bluemirr5/md_dolphin/issues). For security vulnerabilities, see [SECURITY.md](SECURITY.md).
