# Hermes Agent — autonomous swaps

Add the signer to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  vortr:
    command: "npx"
    args: ["-y", "@vortr/wallet"]
    env:
      VORTR_SIGNER_KEY: "0x…"   # a HOT wallet with a small balance
    connect_timeout: 60          # first cold npx run downloads deps
```

Keep the key out of chat — set it here, or put `VORTR_SIGNER_KEY=0x…` in
`~/.hermes/.env`. Then reload:

```
/reload-mcp
```

Verify it's wired by asking the agent to call `wallet_address`. Then:

```
you:   swap $5 USDC to ETH
agent: prepare_swap → "sell 5 USDC · receive ≈ 0.0019 ETH (min 0.00189) · approve?"
you:   yes
agent: execute_swap → sent 0x… (confirmed)
```

`prepare_swap` previews and returns a single-use `confirm_token`; nothing is
broadcast until you approve and the agent calls `execute_swap` with that token.

> Tip: register the MCP persistently (above) rather than spawning `npx` per call —
> the server is meant to stay alive across tool calls.
