import { describe, expect, it } from 'vitest';
import { applySlippageFloor, assertWithinImpact, DEFAULT_SLIPPAGE_BPS, MAX_PRICE_IMPACT_BPS } from './pricing.js';

describe('applySlippageFloor', () => {
  it('reduces buyAmount by the slippage bps', () => {
    expect(applySlippageFloor('1000000', 100)).toBe('990000'); // 1% off
  });

  it('uses the default slippage when bps is undefined', () => {
    const floor = BigInt(applySlippageFloor('1000000', undefined));
    expect(floor).toBe(1000000n - (1000000n * BigInt(DEFAULT_SLIPPAGE_BPS)) / 10000n);
  });
});

describe('assertWithinImpact', () => {
  it('passes when impact is undefined (best-effort)', () => {
    expect(() => assertWithinImpact(undefined)).not.toThrow();
  });

  it('passes when impact is below the ceiling', () => {
    expect(() => assertWithinImpact(MAX_PRICE_IMPACT_BPS - 1)).not.toThrow();
  });

  it('throws (fail-closed) when impact exceeds the ceiling', () => {
    expect(() => assertWithinImpact(MAX_PRICE_IMPACT_BPS + 1)).toThrow(/price impact/i);
  });
});
