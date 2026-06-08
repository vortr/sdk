# @vortr/mcp

Keyless **connector MCP** for non-custodial token swaps on **Base**, for AI agents.
Search tokens, get live 0x quotes, and build ERC-5792 approve+swap calldata — then
**your agent signs + sends the ERC-5792 payload with its own wallet**. Vortr never signs.

For autonomous, key-in-env execution (no browser), use the companion
[`@vortr/wallet`](https://www.npmjs.com/package/@vortr/wallet) local signer instead.

## Tools

| Tool | What it does |
|------|--------------|
| `search_tokens` | Resolve a symbol/name/address in the Base token registry |
| `get_quote` | Live 0x swap quote (price, route, min-out) — read-only |
| `build_swap` | Firm ERC-5792 `{ payload, summary }` — your agent signs + sends |
| `get_portfolio` | Base token set for a wallet address |

## Use it

The simplest path is the **hosted** connector — no install, no secret:

```bash
# Claude Code
claude mcp add --transport http vortr https://www.vortragents.com/mcp
```

```yaml
# Hermes — ~/.hermes/config.yaml (speaks HTTP MCP directly, no bridge)
mcp_servers:
  vortr:
    url: "https://www.vortragents.com/mcp"
```

Claude (web/desktop): add `https://www.vortragents.com/mcp` as a custom connector.

### Self-host (advanced)

Run this stdio package against your **own** deployment with your own
`VORTR_API_BASE` + `VORTR_API_SECRET` (those gate your 0x key):

```bash
npx -y @vortr/mcp
```

## Non-custodial

The connector never holds or sees a signing key. `build_swap` returns calldata;
your agent signs + sends the ERC-5792 payload with its own wallet (or run
`@vortr/wallet` for autonomous signing). See the bundled `SKILL.md` (the
drop-in agent skill, also at https://www.vortragents.com/skill.md) and
[SECURITY.md](https://github.com/vortr/sdk/blob/master/SECURITY.md).

Base only (chain 8453). MIT licensed. Part of the
[Vortr SDK](https://github.com/vortr/sdk).
