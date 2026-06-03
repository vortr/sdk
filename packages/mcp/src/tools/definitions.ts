import { z } from 'zod';

export const searchTokensSchema = { query: z.string().describe('symbol, name, or address to search on Base') };
export const quoteSchema = {
  sellToken: z.string().describe('Base token address being sold'),
  buyToken: z.string().describe('Base token address being bought'),
  amount: z.string().describe('sell amount in BASE UNITS (stringified integer, e.g. 1 USDC = "1000000")'),
  taker: z.string().describe('taker wallet address (0x…); with the @vortr/wallet signer, use wallet_address'),
  slippageBps: z.number().int().min(0).max(1000).optional().describe('slippage in basis points; default 25 (0.25%)'),
};
export const portfolioSchema = { address: z.string().describe('wallet address on Base') };
export const READ_ONLY = { readOnlyHint: true } as const;
export const PREPARE = { destructiveHint: true } as const;
