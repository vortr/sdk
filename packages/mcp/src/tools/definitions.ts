import { z } from 'zod';
import { addressSchema, baseUnitsSchema } from '@vortr/core';

export const searchTokensSchema = { query: z.string().describe('symbol, name, or address to search on Base') };
export const quoteSchema = {
  sellToken: addressSchema.describe('Base token address being sold (0x…)'),
  buyToken: addressSchema.describe('Base token address being bought (0x…)'),
  amount: baseUnitsSchema.describe('sell amount in BASE UNITS (stringified integer, e.g. 1 USDC = "1000000"; NOT "1.5")'),
  taker: addressSchema.describe('taker wallet address (0x…); with the @vortr/wallet signer, use wallet_address'),
  slippageBps: z.number().int().min(0).max(1000).optional().describe('slippage in basis points; default 25 (0.25%)'),
};
export const portfolioSchema = { address: addressSchema.describe('wallet address on Base (0x…)') };
export const READ_ONLY = { readOnlyHint: true } as const;
export const PREPARE = { destructiveHint: true } as const;
