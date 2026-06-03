# Claude Code

## Autonomous — local signer (`@vortr/wallet`)

```bash
claude mcp add --scope user vortr -e VORTR_SIGNER_KEY=0x… -- npx -y @vortr/wallet
```

Use a hot wallet. Then in a session: ask to swap, review the `prepare_swap`
summary, approve, and the agent calls `execute_swap`.

## Keyless — connector (`@vortr/mcp`)

Sign in your own wallet via the `sign_url` that `build_swap` returns:

```bash
claude mcp add --transport http vortr https://www.vortr.xyz/mcp
```

No key, no install, no secret — `search_tokens` / `get_quote` / `build_swap`,
and you open `sign_url` to confirm.

## Tools

`@vortr/wallet`: `wallet_address`, `search_tokens`, `get_quote`,
`prepare_swap`, `execute_swap`, `swap_status`.

`@vortr/mcp`: `search_tokens`, `get_quote`, `build_swap`, `get_portfolio`.
