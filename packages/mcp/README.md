# @vortr/mcp

Keyless **connector MCP** for non-custodial token swaps on **Base**, for AI agents.
Search tokens, get live 0x quotes, and build ERC-5792 approve+swap calldata — then
**sign in your own wallet** via the `sign_url` it returns. Vortr never signs.

For autonomous, key-in-env execution (no browser), use the companion
[`@vortr/wallet`](https://www.npmjs.com/package/@vortr/wallet) local signer instead.

## Tools

| Tool | What it does |
|------|--------------|
| `search_tokens` | Resolve a symbol/name/address in the Base token registry |
| `get_quote` | Live 0x swap quote (price, route, min-out) — read-only |
| `build_swap` | Firm ERC-5792 `{ payload, summary, sign_url }` — you sign |
| `get_portfolio` | Base token set for a wallet address |

## Use it

The simplest path is the **hosted** connector — no install, no secret:

```bash
# Claude Code
claude mcp add --transport http vortr https://www.vortr.xyz/mcp
```

```yaml
# Hermes — ~/.hermes/config.yaml (speaks HTTP MCP directly, no bridge)
mcp_servers:
  vortr:
    url: "https://www.vortr.xyz/mcp"
```

Claude (web/desktop): add `https://www.vortr.xyz/mcp` as a custom connector.

### Self-host (advanced)

Run this stdio package against your **own** deployment with your own
`VORTR_API_BASE` + `VORTR_API_SECRET` (those gate your 0x key):

```bash
npx -y @vortr/mcp
```

## Non-custodial

The connector never holds or sees a signing key. `build_swap` returns calldata +
a `sign_url`; you confirm in your own wallet. See the bundled `SKILL.md` (the
drop-in agent skill, also at https://www.vortr.xyz/skill.md) and
[SECURITY.md](https://github.com/vortr/sdk/blob/master/SECURITY.md).

Base only (chain 8453). MIT licensed. Part of the
[Vortr SDK](https://github.com/vortr/sdk).
