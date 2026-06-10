import { searchTokens, isBaseToken, DEFAULT_SLIPPAGE_BPS } from '@vortr/core';
import type { ApiClient } from '../apiClient.js';

export interface ToolDeps { client: ApiClient }
type Content = { content: { type: 'text'; text: string }[] };

const json = (value: unknown): Content => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });

export async function searchTokensHandler(args: { query: string }, _deps: ToolDeps): Promise<Content> {
  return json({ tokens: searchTokens(args.query) });
}

function assertBaseTokens(sellToken: string, buyToken: string): void {
  for (const t of [sellToken, buyToken]) {
    if (!isBaseToken(t)) throw new Error(`${t} is not a known Base token. Use search_tokens to find a valid address.`);
  }
}

/** Reject a malformed `amount` (decimal/negative/empty) before it round-trips to
 *  the API as an opaque 400 — the most common LLM mistake is "1.5" for base units. */
function assertBaseUnits(amount: string): void {
  if (!/^\d+$/.test(amount.trim()) || BigInt(amount.trim()) <= 0n) {
    throw new Error(
      `amount "${amount}" must be in base units — a whole integer string like "1000000" (= 1 USDC), ` +
        `not a decimal such as "1.5". Multiply by 10^decimals for the token.`,
    );
  }
}

export async function getQuoteHandler(
  args: { sellToken: string; buyToken: string; amount: string; taker: string; slippageBps?: number },
  deps: ToolDeps,
): Promise<Content> {
  assertBaseTokens(args.sellToken, args.buyToken);
  assertBaseUnits(args.amount);
  const quote = await deps.client.postQuote({
    chainId: 8453, sellToken: args.sellToken, buyToken: args.buyToken,
    sellAmount: args.amount, taker: args.taker, slippageBps: args.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
  });
  return json(quote);
}

export async function getPortfolioHandler(args: { address: string }, deps: ToolDeps): Promise<Content> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(args.address)) {
    throw new Error(`${args.address} is not a valid address`);
  }
  const portfolio = await deps.client.getPortfolio(args.address);
  return json(portfolio);
}

export async function buildSwapHandler(
  args: { sellToken: string; buyToken: string; amount: string; taker: string; slippageBps?: number },
  deps: ToolDeps,
): Promise<Content> {
  assertBaseTokens(args.sellToken, args.buyToken);
  assertBaseUnits(args.amount);
  const result = await deps.client.postBuildSwap({
    chainId: 8453, sellToken: args.sellToken, buyToken: args.buyToken,
    sellAmount: args.amount, taker: args.taker, slippageBps: args.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
  });
  return json({
    ...result,
    next_steps: 'This MCP never signs. payload is an ERC-5792 approve+swap batch (payload.calls). ' +
      'To execute: sign it in your own wallet, or run the @vortr/wallet local signer for autonomous execution (prepare_swap -> execute_swap). If summary.expiresAt has passed, call build_swap again.',
  });
}
