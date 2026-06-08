# Vortr SDK

[![ci](https://github.com/vortr/sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/vortr/sdk/actions/workflows/ci.yml)
[![@vortr/wallet](https://img.shields.io/npm/v/@vortr/wallet?label=%40vortr%2Fwallet)](https://www.npmjs.com/package/@vortr/wallet)
[![@vortr/mcp](https://img.shields.io/npm/v/@vortr/mcp?label=%40vortr%2Fmcp)](https://www.npmjs.com/package/@vortr/mcp)
[![license](https://img.shields.io/npm/l/@vortr/wallet)](LICENSE)

Open-source packages behind [Vortr](https://vortr.xyz) — non-custodial DeFi swaps
on **Base** for AI agents and developers. Vortr never holds your keys. Published
to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).

## Try it (no install, no key)

```bash
node examples/quote.mjs WETH USDC 0.05    # live 0x quote + approve/swap calldata + a sign_url
```

A keyless live quote straight from the hosted connector — see [`examples/`](examples/)
for the script and the `@vortr/wallet` autonomous-signing example.

## Packages

| Package | npm | What it is |
|---------|-----|------------|
| **`@vortr/wallet`** | [`@vortr/wallet`](https://www.npmjs.com/package/@vortr/wallet) | Local **signer** MCP. Holds an EOA key in `VORTR_SIGNER_KEY` (env, never chat), fetches keyless calldata from the Vortr connector, and signs + broadcasts Base swaps after a per-swap confirm. Autonomous end-to-end swaps for an agent. |
| **`@vortr/mcp`** | [`@vortr/mcp`](https://www.npmjs.com/package/@vortr/mcp) | Stdio **connector** MCP. Keyless swap tools (search tokens, 0x quotes, ERC-5792 approve+swap calldata). You sign in your own wallet via `sign_url`. |
| `@vortr/core` | (bundled) | Shared library — Base token registry, 0x Swap API v2 adapter, ERC-5792 call builder, market data. Bundled into the packages above; not published on its own. |

## Quick start — autonomous swaps

```jsonc
// ~/.hermes/config.yaml (or any MCP host)
mcp_servers:
  vortr:
    command: "npx"
    args: ["-y", "@vortr/wallet"]
    env: { VORTR_SIGNER_KEY: "0x…" }   // a HOT wallet with a small balance
    connect_timeout: 60
```

Then: *"swap $5 USDC to ETH"* → the agent calls `prepare_swap` → shows you the
summary → on your **"yes"** → `execute_swap`. See
[`packages/wallet/README.md`](packages/wallet/README.md).

For the keyless / browser-signing path, use `@vortr/mcp` or the hosted connector at
`https://www.vortr.xyz/mcp`.

## Tools

`@vortr/mcp` (keyless connector) + the hosted MCP expose four read/build tools; Vortr never signs:

| Tool | What it does |
|------|--------------|
| `search_tokens` | Resolve a symbol / name / address to a Base token (`TokenInfo[]`). |
| `get_quote` | Live 0x quote — `buyAmount`, `minBuyAmount`, route, price impact. `amount` is BASE UNITS. |
| `build_swap` | ERC-5792 `wallet_sendCalls` payload (approve + swap) + a `sign_url`. |
| `get_portfolio` | The Base token set for an address. |

`@vortr/wallet` (local signer) adds the autonomous flow on top:

| Tool | What it does |
|------|--------------|
| `wallet_address` | The local signer's EOA address — use as the taker. |
| `prepare_swap` | Quote + stage a swap → `{ confirm_token, summary }` (`summary.buy` = expected, `summary.buyMin` = floor). |
| `execute_swap` | Sign + broadcast a prepared swap on Base (per-swap confirm). |
| `swap_status` | Poll a broadcast transaction hash. |

## Supported Base tokens

17 verified assets — every entry is CoinGecko-canonical with its on-chain `symbol()`/`decimals()` confirmed:

> ETH · WETH · USDC · USDT · DAI · USDe · EURC · cbBTC · cbETH · wstETH · weETH · AERO · MORPHO · VIRTUAL · BRETT · DEGEN · cbADA

`search_tokens` resolves any of them by symbol, name, or address; the set grows as Base liquidity warrants.

## Security

`@vortr/wallet` signs locally — the key never leaves your machine. Two files touch it;
read them in 30 seconds → [SECURITY.md](SECURITY.md). Releases are published from CI
with **npm provenance**.

## Develop

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Supported chain: **Base** (8453). MIT licensed.
