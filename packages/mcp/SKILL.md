---
name: vortr-swaps
description: Non-custodial DeFi swaps on Base via the Vortr MCP (remote connector https://www.vortr.xyz/mcp — no secret) — search tokens, get 0x quotes, build ERC-5792 approve+swap calldata, then sign in your own wallet via the returned sign_url (default), or run the @vortr/wallet local signer for autonomous execution. Vortr never signs. Use when an agent needs to price or execute a token swap on Base.
---

# Vortr MCP — Skill Guide

Vortr gives AI assistants non-custodial DeFi capabilities on Base: token search, 0x swap quotes, and ERC-5792 swap payloads. You sign every trade in your own wallet — `build_swap` returns a `sign_url` to open and confirm (default), or run the first-party `@vortr/wallet` local signer alongside the connector for autonomous execution. Vortr never signs anything.

> This file is a valid skill for **both** Claude Code skills and **Hermes Agent**
> (NousResearch) — drop it into `~/.hermes/skills/defi/vortr-swaps/`.

## Quick start — autonomous swaps (the agent sets this up)

When a user installs this skill and asks to swap, **wire yourself up — don't make them
hand-edit files.** End-to-end swaps run through the first-party local signer
**`@vortr/wallet`** (published on npm; `npx` auto-fetches it).

**Step 1 — register the MCP** (once). If the `vortr` tools aren't loaded, add this under
`mcp_servers:` in `~/.hermes/config.yaml` (create the key if absent), then `/reload-mcp`:

```yaml
mcp_servers:
  vortr:
    command: "npx"
    args: ["-y", "@vortr/wallet"]
    env:
      VORTR_SIGNER_KEY: "0x…"   # the user's hot-wallet key (see Step 2)
    connect_timeout: 60          # first cold npx run downloads deps
```

**Step 2 — the signing key.** `@vortr/wallet` reads the EOA key from `VORTR_SIGNER_KEY`.
Get it from the user one of two ways (their choice):
- **Fastest (DYOR):** the user gives the key in chat → write it into the `env` block above
  (or `VORTR_SIGNER_KEY=0x…` in `~/.hermes/.env`), then `/reload-mcp`. Note the key then
  lives in the chat log + on disk.
- **Safer:** the user puts `VORTR_SIGNER_KEY=0x…` in `~/.hermes/.env` themselves so it never
  enters the chat, then `/reload-mcp`.

Either way, use a **hot wallet with a small balance** — never a main wallet.

**Step 3 — verify + swap.** Call `wallet_address`; once it returns an address you're ready.
Then `search_tokens`/`get_quote` → show the summary → get the user's **"yes"** →
`execute_swap` → `swap_status`. `@vortr/wallet` is self-contained (it also exposes
`search_tokens` + `get_quote`), so this **one local MCP** covers the whole flow — no separate
connector needed. The key never leaves the local `@vortr/wallet` process; Vortr never signs.

**Showing the summary — lead with the EXPECTED amount, not the floor.** `prepare_swap`'s
`summary` has both `buy` (expected receive, pre-slippage) and `buyMin` (guaranteed minimum after
the default 0.25% slippage). Present it as *"≈ {buy} (min {buyMin})"* — e.g. *"≈ 0.999 USDC
(min 0.997)"*. Do **not** headline only `buyMin`: it's a worst-case floor, not the likely fill,
and shown alone it reads like a ~1% loss when the real cost is ~0.1%. (`summary.buy` may be
absent against an older server — then just show the minimum.)

**Call the tools through MCP — don't shell out.** Let Hermes own the server via `mcp_servers`
and invoke `prepare_swap`/`execute_swap` as MCP tools. Do **not** hand-roll
`subprocess`/`npx @vortr/wallet` per call — each spawn is a cold start meant to be one shared
live server. (Even if a stray fresh process happens, the `confirm_token` is persisted to disk,
so `execute_swap` still finds the pending swap a different process prepared.)

**If `prepare_swap` returns `insufficient <TOKEN> …`** the wallet isn't funded — relay that
line and stop. Don't retry, rebuild, or hunt for an "approve" step: token approval is already
inside the calldata `execute_swap` replays (there is no separate approve tool), and a swap
can't be built for a balance the wallet doesn't have.

## Installation

Use the remote connector. Sign by opening the `sign_url` `build_swap` returns. No `@vortr/mcp`
install, no API key, **no secret**.

### Remote connector — Claude (web/desktop)

Vortr is a hosted remote MCP. Add this URL as a custom connector:

```
https://www.vortr.xyz/mcp
```

Streamable HTTP, public, stateless — exposes `search_tokens`, `get_quote`,
`get_portfolio`, `build_swap`.

### Claude Code

```bash
claude mcp add --transport http vortr https://www.vortr.xyz/mcp
```

### Hermes Agent (NousResearch)

Hermes speaks HTTP MCP directly — add the connector by URL (no `mcp-remote` bridge needed).
Put it under `mcp_servers:` in `~/.hermes/config.yaml`, then `/reload-mcp`:

```yaml
mcp_servers:
  vortr:
    url: "https://www.vortr.xyz/mcp"
```

This is the keyless **sign_url** path (search/quote/build; you sign in your own wallet). For
autonomous, key-in-env execution instead, use `@vortr/wallet` — see **Quick start** above.

### Signing

The connector never signs (non-custodial). `build_swap` returns a `sign_url` — open it to
confirm in your own wallet. This is the default path: no keys involved in the connector at all.

### Autonomous signing with `@vortr/wallet` (local key)

To let an agent execute end-to-end without a browser (no `sign_url` step), run the
first-party local signer **`@vortr/wallet`** alongside this connector. It holds
your EOA key locally in `VORTR_SIGNER_KEY` (env, never in chat), auto-fills the taker,
fetches the keyless calldata from the connector itself, and signs+broadcasts on Base
after a per-swap confirm:

1. `wallet_address` → use the returned address as the taker
2. `prepare_swap { sellToken, buyToken, usd|amount }` → `{ confirm_token, summary }`
3. (show summary to user; get approval)
4. `execute_swap { confirm_token }` → broadcasts on Base
5. `swap_status { hash }` → poll until confirmed

Note: `prepare_swap` fetches its own calldata — do NOT pass `payload.calls` from `build_swap`.
The hosted Vortr stays non-custodial — the key lives only in `@vortr/wallet`.
Use a hot wallet with a measured balance. See `packages/wallet/README.md`.

**Single MCP (simplest):** `@vortr/wallet` is self-contained — it also exposes
`search_tokens` + `get_quote`, so you can register ONLY it (it proxies quote/build
from the keyless connector and signs locally) and skip adding the remote connector
separately. Still non-custodial; the key never leaves the local process.

Install it (published on npm — `npx` auto-fetches it, no manual install):

```bash
# Claude Code
claude mcp add --scope user vortr -e VORTR_SIGNER_KEY=0x… -- npx -y @vortr/wallet
```

```yaml
# Hermes — ~/.hermes/config.yaml (generous connect_timeout for the first cold npx fetch)
mcp_servers:
  vortr:
    command: "npx"
    args: ["-y", "@vortr/wallet"]
    env: { VORTR_SIGNER_KEY: "0x…" }
    connect_timeout: 60
```

### Self-host (advanced)

Running your OWN Vortr deployment? Use the `@vortr/mcp` stdio package with your own
`VORTR_API_BASE` + `VORTR_API_SECRET` (those gate your 0x key) instead of the connector —
point `VORTR_API_BASE` at your deployment (localhost is rejected; use your running web app
for local dev). Not needed to use hosted Vortr. To install this skill itself, copy this
folder into `~/.hermes/skills/defi/vortr-swaps/`.

## Tools

| Tool | Description |
|------|-------------|
| `search_tokens` | Search the Base token registry by symbol, name, or address. Returns `TokenInfo[]`. |
| `get_quote` | Get a 0x swap quote on Base (price, `minBuyAmount`, route, price impact). `amount` is base units. |
| `build_swap` | Build an ERC-5792 `send_calls` payload (approve + swap). Returns `{ payload, summary, sign_url }`. |
| `get_portfolio` | Get token balances for an address on Base. |

## Full Swap Recipe

1. `vortr.search_tokens(query)` — find `sellToken` and `buyToken` addresses.
2. `vortr.get_quote(sellToken, buyToken, amount, taker)` — preview price and `minBuyAmount`.
3. `vortr.build_swap(sellToken, buyToken, amount, taker)` — get `{ payload, summary, sign_url }`.
   - `summary.expiresAt` is an epoch ms deadline; call `build_swap` again if it has passed.
4. Open `sign_url`, connect your wallet, and confirm. Vortr never signs.

### Autonomous signing (optional)

Instead of opening `sign_url`, run `@vortr/wallet` alongside the connector (see
[Autonomous signing with @vortr/wallet](#autonomous-signing-with-vortrawallet-local-key) above).
The flow is `wallet_address` → `prepare_swap` → `execute_swap` → `swap_status`.

## Recovery

| Error | Action |
|-------|--------|
| `summary.expiresAt` passed | Call `vortr.build_swap` (or `prepare_swap`) again before retrying |

## Notes

- **Amount is BASE UNITS**: 1 USDC = `"1000000"` (6 decimals); 1 ETH = `"1000000000000000000"` (18 decimals).
- **Vortr never signs.** You confirm in your own wallet — open the `sign_url` (default), or run `@vortr/wallet` for autonomous signing.
- **Base-only**: All tokens must be on Base (chain ID 8453). Use `search_tokens` to look up valid addresses.
