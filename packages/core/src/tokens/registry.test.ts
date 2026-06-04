import { describe, expect, it } from 'vitest';
import { getToken, searchTokens, isBaseToken, BASE_TOKENS } from './registry.js';
import { NATIVE_TOKEN_ADDRESS } from '../types.js';

describe('token registry', () => {
  it('includes native ETH and USDC', () => {
    expect(getToken(NATIVE_TOKEN_ADDRESS)?.symbol).toBe('ETH');
    expect(getToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')?.symbol).toBe('USDC');
  });

  it('looks up case-insensitively', () => {
    expect(getToken('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')?.symbol).toBe('USDC');
  });

  it('searches by symbol and name', () => {
    const bySymbol = searchTokens('usdc');
    expect(bySymbol.map((t) => t.symbol)).toContain('USDC');
    expect(searchTokens('ether').map((t) => t.symbol)).toContain('ETH');
  });

  it('isBaseToken accepts a known address and rejects an unknown one', () => {
    expect(isBaseToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(true);
    expect(isBaseToken('0x0000000000000000000000000000000000000001')).toBe(false);
  });

  it('every registry entry is on Base (chainId 8453)', () => {
    expect(BASE_TOKENS.every((t) => t.chainId === 8453)).toBe(true);
  });

  it('resolves the added blue-chips (cbETH / USDe / AERO) by symbol + canonical address', () => {
    expect(searchTokens('cbeth').map((t) => t.symbol)).toContain('cbETH');
    expect(getToken('0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34')?.symbol).toBe('USDe');
    expect(getToken('0x940181a94A35A4569E4529A3CDfB74e38FD98631')?.symbol).toBe('AERO');
  });
});
