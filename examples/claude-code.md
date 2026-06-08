# Claude Code

## Autonomous — local signer (`@vortr/wallet`)

```bash
claude mcp add --scope user vortr -e VORTR_SIGNER_KEY=0x… -- npx -y @vortr/wallet
```

Use a hot wallet. Then in a session: ask to swap, review the `prepare_swap`
summary, approve, and the agent calls `execute_swap`.

## Keyless — connector (`@vortr/mcp`)

Your agent signs + sends the ERC-5792 payload that `build_swap` returns with its
own wallet (or run `@vortr/wallet` for autonomous signing):

```bash
claude mcp add --transport http vortr https://www.vortragents.com/mcp
```

No key, no install, no secret — `search_tokens` / `get_quote` / `build_swap`,
and your agent signs + sends the payload itself.

## Tools

`@vortr/wallet`: `wallet_address`, `search_tokens`, `get_quote`,
`prepare_swap`, `execute_swap`, `swap_status`.

`@vortr/mcp`: `search_tokens`, `get_quote`, `build_swap`, `get_portfolio`.
