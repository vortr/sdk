# Contributing

Thanks for your interest in Vortr. This repo holds the open-source packages
`@vortr/wallet`, `@vortr/mcp`, and the bundled `@vortr/core`.

## Develop

```bash
pnpm install          # Node >= 18, pnpm 9
pnpm -r typecheck
pnpm -r build
pnpm -r test
```

- TypeScript, strict mode (`verbatimModuleSyntax`, `noUncheckedIndexedAccess`).
- Tests use Vitest, colocated as `*.test.ts`. New behaviour ships with a test.
- `@vortr/core` exports source and is bundled into `wallet`/`mcp` via tsup
  (`noExternal`); it is not published on its own.

## Pull requests

1. Branch from `master`.
2. Keep the change focused; match the style of the surrounding code.
3. `pnpm -r typecheck && pnpm -r build && pnpm -r test` must pass — CI runs the
   same on every PR.
4. Note any user-facing change in `CHANGELOG.md`.

## Releases

Maintainers cut releases by bumping the package version and pushing a tag:

```bash
git tag vX.Y.Z && git push origin master --tags
```

CI then publishes `@vortr/wallet` + `@vortr/mcp` to npm **with provenance**
(`.github/workflows/release.yml`). The published tarball is cryptographically
linked back to the tagged commit.

## Security

Please do **not** open public issues for vulnerabilities. See
[SECURITY.md](SECURITY.md) — report via a GitHub security advisory or
security@vortr.xyz.

## Scope

Vortr is non-custodial and Base-only (chain 8453). Keep changes aligned with
that: the signer key never leaves the local process, and Vortr never holds keys.
