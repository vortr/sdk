import { encodeFunctionData, erc20Abi, getAddress, numberToHex, type Hex } from 'viem';
import { chainIdToChainName } from '../chains.js';
import { assertWithinImpact } from '../pricing.js';
import {
  NATIVE_TOKEN_ADDRESS,
  type BuildSwapResult,
  type Call,
  type QuoteResult,
} from '../types.js';

const DEFAULT_TTL_MS = 30_000;

export interface BuildSwapOptions {
  /** Injectable clock for tests; defaults to Date.now(). */
  nowMs?: number;
  ttlMs?: number;
}

function isNative(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

/**
 * Turn a firm 0x quote into the exact ERC-5792 `wallet_sendCalls` payload:
 * { chain, from, calls: [approve?, swap] }. `atomicRequired` is intentionally
 * omitted so signers fall back to non-atomic mode for EOAs without ERC-5792
 * atomic support.
 */
export function buildSwapCalls(quote: QuoteResult, opts: BuildSwapOptions = {}): BuildSwapResult {
  if (!quote.liquidityAvailable) {
    throw new Error('no liquidity available for this pair/size');
  }
  assertWithinImpact(quote.estimatedPriceImpactBps);

  const nowMs = opts.nowMs ?? Date.now();
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;

  const calls: Call[] = [];
  const sellIsNative = isNative(quote.sellToken);
  const needsApprove =
    !sellIsNative && BigInt(quote.allowanceActual) < BigInt(quote.sellAmount);

  if (needsApprove) {
    calls.push({
      to: getAddress(quote.sellToken),
      // Exact-amount approval (not unlimited) to the 0x AllowanceHolder spender.
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [getAddress(quote.allowanceTarget), BigInt(quote.sellAmount)],
      }),
      value: '0x0',
    });
  }

  calls.push({
    to: getAddress(quote.transaction.to),
    data: quote.transaction.data as Hex,
    value: numberToHex(BigInt(quote.transaction.value || '0')),
  });

  return {
    payload: {
      chain: chainIdToChainName(quote.chainId),
      from: getAddress(quote.taker),
      calls,
    },
    summary: {
      // Summary tokens are display-only; pass through verbatim (no checksum needed).
      sell: { token: quote.sellToken, amount: quote.sellAmount },
      buy: { token: quote.buyToken, amount: quote.buyAmount },
      buyMin: { token: quote.buyToken, amount: quote.minBuyAmount },
      estimatedPriceImpactBps: quote.estimatedPriceImpactBps,
      feeBps: quote.feeBps,
      taker: getAddress(quote.taker),
      expiresAt: nowMs + ttlMs,
    },
  };
}
