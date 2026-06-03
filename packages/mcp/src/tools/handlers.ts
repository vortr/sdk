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

export async function getQuoteHandler(
  args: { sellToken: string; buyToken: string; amount: string; taker: string; slippageBps?: number },
  deps: ToolDeps,
): Promise<Content> {
  assertBaseTokens(args.sellToken, args.buyToken);
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
