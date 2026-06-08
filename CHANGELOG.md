# Changelog

All notable changes to the published packages. This repo is the open-source home
of `@vortr/wallet` and `@vortr/mcp`; `@vortr/core` is bundled into both.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions are [SemVer](https://semver.org/). From `@vortr/wallet@0.1.4` /
`@vortr/mcp@0.1.3` onward, releases are published from CI with npm provenance.

## @vortr/wallet

### 0.1.8
- Registry expanded to **17 Base tokens** — added **EURC, wstETH, weETH, MORPHO,
  VIRTUAL, BRETT, DEGEN, cbADA** (each CoinGecko-canonical with on-chain
  `symbol()`/`decimals()` + DefiLlama price confirmed).
- Added **registry-integrity tests** (EIP-55 checksum, no duplicate address/symbol,
  sane decimals) that fail the build before a malformed token can ship.
- Added runnable [`examples/`](examples/): keyless `quote.mjs` (zero-dep) and
  `wallet.mjs` (the local-signer flow).

### 0.1.7
- Added Base tokens to the registry: **cbETH**, **USDe**, **AERO** (CoinGecko
  canonical address + on-chain symbol/decimals verified). 9 tokens total.

### 0.1.6
- Maintenance release — republished from CI. No API or behaviour change.

### 0.1.5
- docs: Hermes connects to the connector by URL (HTTP MCP); dropped the stale
  `mcp-remote` bridge example. No runtime change.

### 0.1.4
- First release published from CI with **npm provenance** (Sigstore).

### 0.1.3
- `prepare_swap` summary now includes `buy` (the expected amount out, pre-slippage)
  alongside `buyMin` (the post-slippage floor), so clients can show
  "≈ expected (min …)" instead of only the worst-case number.
- Default slippage tightened from 0.5% to **0.25%** (applied at the tool edge;
  Vortr's universe is deep-liquidity Base blue-chips).

### 0.1.2
- `prepare_swap` now **preflights the on-chain balance** and fails fast with the
  exact shortfall instead of building an unfillable swap.
- `confirm_token` store is **file-backed** (single-use, expiry-checked), so
  `execute_swap` resolves the token even across separate processes.

### 0.1.1
- Branded ASCII boot banner on stderr (stdout stays the JSON-RPC channel).

### 0.1.0
- Initial release — local signer MCP: `wallet_address`, `search_tokens`,
  `get_quote`, `prepare_swap`, `execute_swap`, `swap_status`. Key in env, signs
  locally, per-swap confirm. The hosted Vortr never holds the key.

## @vortr/mcp

### 0.1.7
- Registry expanded to **17 Base tokens** — added **EURC, wstETH, weETH, MORPHO,
  VIRTUAL, BRETT, DEGEN, cbADA** (CoinGecko-canonical + on-chain symbol/decimals +
  DefiLlama price verified).

### 0.1.6
- Added Base tokens: **cbETH**, **USDe**, **AERO** (CoinGecko + on-chain verified).
  9 tokens total.

### 0.1.5
- Maintenance release — republished from CI. No API or behaviour change.

### 0.1.4
- docs: add a package README (the npm landing page was blank).
- docs: Hermes connects by URL (drop `mcp-remote`).

### 0.1.3
- First release published from CI with **npm provenance**.
- Default slippage tightened to 0.25% at the tool edge.

### 0.1.2
- Boot banner on stderr.

### 0.1.1
- Documentation + tool-description alignment.

### 0.1.0
- Initial release — keyless connector MCP: `search_tokens`, `get_quote`,
  `build_swap`, `get_portfolio`. You sign in your own wallet via `sign_url`.
