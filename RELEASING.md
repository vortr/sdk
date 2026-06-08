# Releasing

Each package's version lives in its `package.json` and is read at runtime
(`packages/<pkg>/src/version.ts` → boot banner + MCP `serverInfo`), so the
displayed version never drifts. **Bump only the `package.json` version.**

1. Bump `packages/<pkg>/package.json` `version`.
2. Commit, tag, push:
   ```bash
   git commit -am "release: @vortr/<pkg>@X.Y.Z"
   git tag vX.Y.Z
   git push origin master --tags
   ```
   The `v*` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml),
   which publishes `@vortr/wallet` + `@vortr/mcp` to npm **with provenance**.
3. Update the standalone mirror repos ([`vortr/mcp`](https://github.com/vortr/mcp)
   + [`vortr/wallet`](https://github.com/vortr/wallet)):
   ```bash
   pnpm sync-mirrors
   ```
   Snapshots each package's current source into its read-only mirror, committed
   and tagged with the package version. Requires a `gh` login with push access to
   those repos. The mirrors are read-only — issues + PRs belong here, in `vortr/sdk`.
