# Security

`@vortr/wallet` is a **local signer**: it holds an EOA private key and signs Base
swaps on your own machine. The hosted Vortr service never holds or sees your key.
This document lets you verify that in about 30 seconds.

## The key never leaves your machine — verify it yourself

Only **two files** in `@vortr/wallet` touch the key. Read them:

| File | What to check |
|------|---------------|
| [`packages/wallet/src/config.ts`](packages/wallet/src/config.ts) | The key is read **only** from the `VORTR_SIGNER_KEY` environment variable (validated against `/^0x[0-9a-fA-F]{64}$/`). It is never accepted as a tool argument or chat input. |
| [`packages/wallet/src/signer.ts`](packages/wallet/src/signer.ts) | The **only** place the key is used. `privateKeyToAccount(key)` builds a local viem account; signing + broadcasting happen locally against a Base RPC. The key is never logged, never returned by a tool, never put on the wire. |

And one file proves what *does* get sent off-machine:

| File | What to check |
|------|---------------|
| [`packages/wallet/src/connector.ts`](packages/wallet/src/connector.ts) | The only outbound calls are to the **keyless** Vortr connector (`build_swap`/`get_quote`) and a price endpoint. They send token symbols, amounts, and the **public** taker address — never the key. The signer fetches calldata, then signs it locally. |

## Other safeguards

- **No install scripts.** None of the packages run `preinstall`/`install`/`postinstall`,
  so `npx @vortr/wallet` executes only the published, auditable code.
- **Minimal dependencies:** `viem`, `@modelcontextprotocol/sdk`, `zod`.
- **Confirm-each-swap.** `prepare_swap` previews and returns a single-use `confirm_token`;
  nothing is broadcast until `execute_swap` is called with that exact token, which is
  bound to the previewed calldata and expires in ~30s. A prompt-injected agent cannot make
  `execute_swap` sign anything other than what you saw.
- **Preflight.** `prepare_swap` checks your on-chain balance first and fails fast rather
  than building a swap you can't fund.

## Verify the published package matches this source

Releases are published from CI with **npm provenance** (Sigstore). On the
[npm page](https://www.npmjs.com/package/@vortr/wallet) you'll see a "Provenance"
section linking the exact published tarball to the commit and workflow in this repo.

## Use a hot wallet

Fund the signing wallet with only what you're willing to risk. Confirmation bounds
intent, not blast radius.

## Reporting

Found an issue? Open a GitHub security advisory on this repo, or email security@vortr.xyz.
