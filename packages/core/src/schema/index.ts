import { z } from 'zod';
import { BASE_CHAIN_ID } from '../chains.js';

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid address');

export const baseUnitsSchema = z
  .string()
  .regex(/^\d+$/, 'amount must be base-units (integer string)');

export const quoteParamsSchema = z.object({
  chainId: z.literal(BASE_CHAIN_ID),
  sellToken: addressSchema,
  buyToken: addressSchema,
  sellAmount: baseUnitsSchema,
  taker: addressSchema,
  slippageBps: z.number().int().min(0).max(1000).optional(),
});

export const buildSwapParamsSchema = quoteParamsSchema;

export const portfolioParamsSchema = z.object({
  chainId: z.literal(BASE_CHAIN_ID),
  address: addressSchema,
});

export type QuoteParamsInput = z.infer<typeof quoteParamsSchema>;
