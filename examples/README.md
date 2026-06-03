# Examples

Wiring Vortr into an MCP host. Two paths:

- **Autonomous (`@vortr/wallet`)** — a local signer holds your key in env and
  signs Base swaps after a per-swap confirm. The agent quotes, builds, and
  executes end to end. See [hermes.md](hermes.md), [claude-code.md](claude-code.md).
- **Keyless (`@vortr/mcp`)** — search/quote/build only; you sign in your own
  wallet via the `sign_url` it returns. Swap `command`/`args` for
  `url: https://www.vortr.xyz/mcp` if your host speaks HTTP MCP.

Use a **hot wallet** with a small balance. The key lives only in the local
process — never in chat, never sent to Vortr.
