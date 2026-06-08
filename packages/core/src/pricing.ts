export const DEFAULT_SLIPPAGE_BPS = 25; // 0.25% — Vortr's universe is mostly deep-liquidity Base tokens; the floor is overridable per-swap
export const MAX_PRICE_IMPACT_BPS = 1500; // 15% hard ceiling, fail-closed

/** Compute a minimum-out floor from a buyAmount and slippage bps. Consumer-facing helper for web/MCP layers; `buildSwapCalls` deliberately trusts 0x's own `minBuyAmount` instead. */
export function applySlippageFloor(buyAmount: string, slippageBps: number | undefined): string {
  const bps = BigInt(slippageBps ?? DEFAULT_SLIPPAGE_BPS);
  const amount = BigInt(buyAmount);
  return (amount - (amount * bps) / 10000n).toString();
}

/** Fail-closed price-impact guard. No-op when impact is unknown (0x may omit it). */
export function assertWithinImpact(
  estimatedPriceImpactBps: number | undefined,
  ceilingBps: number = MAX_PRICE_IMPACT_BPS,
): void {
  if (estimatedPriceImpactBps === undefined) return;
  if (estimatedPriceImpactBps > ceilingBps) {
    throw new Error(
      `price impact ${estimatedPriceImpactBps}bps exceeds ceiling ${ceilingBps}bps`,
    );
  }
}
