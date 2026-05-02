# Contributing to TRON Wallet

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork and clone the repo
2. Install dependencies: `pnpm install`
3. Start dev server: `pnpm tauri dev`

## Code Style

### Rust
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix all warnings
- Use `snake_case` for functions/variables, `PascalCase` for types

### TypeScript
- Strict mode is enabled — avoid `any` types
- Use functional components with hooks
- Run `npx tsc --noEmit` to check types

### Commits
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Formatting (no code change)
- `refactor:` — Code restructuring
- `test:` — Adding tests
- `chore:` — Build/tooling changes

## Pull Requests

1. Create a feature branch from `main`
2. Keep PRs focused — one feature per PR
3. Include screenshots for UI changes
4. Ensure `pnpm build` and `cargo check` pass
5. Update README if adding new features

## Reporting Issues

- Use GitHub Issues
- Include OS, Rust version, Node version
- Provide steps to reproduce
- Attach screenshots if applicable

## Security

Found a vulnerability? Please open a private security advisory on GitHub instead of a public issue.
