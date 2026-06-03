import { describe, expect, it } from 'vitest';
import { parseAmount, formatAmount } from './amount.js';

describe('parseAmount', () => {
  it('parses USDC (6 decimals)', () => {
    expect(parseAmount('1', 6)).toBe('1000000');
    expect(parseAmount('100.5', 6)).toBe('100500000');
  });

  it('parses ETH (18 decimals)', () => {
    expect(parseAmount('1.5', 18)).toBe('1500000000000000000');
  });

  it('rejects more fractional digits than decimals', () => {
    expect(() => parseAmount('1.1234567', 6)).toThrow(/too many decimal places/i);
  });

  it('rejects non-numeric input', () => {
    expect(() => parseAmount('abc', 6)).toThrow(/invalid amount/i);
  });
});

describe('formatAmount', () => {
  it('formats base-units back to a human string', () => {
    expect(formatAmount('100500000', 6)).toBe('100.5');
    expect(formatAmount('1500000000000000000', 18)).toBe('1.5');
    expect(formatAmount('1000000', 6)).toBe('1');
  });
});
