# Examples

## Runnable scripts

```bash
# Keyless live quote — no install, no key (uses the hosted MCP over fetch)
node quote.mjs                       # 0.01 ETH -> USDC
node quote.mjs WETH USDC 0.05        # any pair + amount
node quote.mjs USDC DEGEN 5 0xYourWallet

# Autonomous local signer (@vortr/wallet) — quote/execute with a local key
npm install                          # pulls @modelcontextprotocol/sdk
export VORTR_SIGNER_KEY=0x...         # a HOT wallet, small balance
node wallet.mjs                      # dry run (quote $1 ETH -> USDC)
node wallet.mjs --execute            # broadcast on Base
```

- [`quote.mjs`](quote.mjs) — zero-dependency. `search_tokens` → `get_quote` → `build_swap` against the hosted connector; prints the expected out, the route, and a `sign_url`. Vortr never signs.
- [`wallet.mjs`](wallet.mjs) — drives the `@vortr/wallet` local signer over MCP (`wallet_address` → `prepare_swap` → `execute_swap` → `swap_status`). The key stays in the local process.

## Wiring Vortr into an MCP host

Two paths:

- **Autonomous (`@vortr/wallet`)** — a local signer holds your key in env and
  signs Base swaps after a per-swap confirm. The agent quotes, builds, and
  executes end to end. See [hermes.md](hermes.md), [claude-code.md](claude-code.md).
- **Keyless (`@vortr/mcp`)** — search/quote/build only; you sign in your own
  wallet via the `sign_url` it returns. Swap `command`/`args` for
  `url: https://www.vortr.xyz/mcp` if your host speaks HTTP MCP.

Use a **hot wallet** with a small balance. The key lives only in the local
process — never in chat, never sent to Vortr.
