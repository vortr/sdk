import { describe, expect, it } from 'vitest';
import { getAddress } from 'viem';
import { getToken, searchTokens, isBaseToken, toChecksum, BASE_TOKENS } from './registry.js';
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

  it('resolves the 2026-06-08 batch by symbol + canonical address', () => {
    const syms = BASE_TOKENS.map((t) => t.symbol);
    for (const s of ['EURC', 'wstETH', 'weETH', 'MORPHO', 'VIRTUAL', 'BRETT', 'DEGEN', 'cbADA']) {
      expect(syms, `should include ${s}`).toContain(s);
    }
    expect(getToken('0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42')?.symbol).toBe('EURC');
    expect(getToken('0xcbADA732173e39521CDBE8bf59a6Dc85A9fc7b8c')?.symbol).toBe('cbADA');
  });
});

// A swap registry is financial data — a wrong/duplicate/badly-cased address could
// route a user into the wrong token. These invariants fail the build before that ships.
describe('registry integrity', () => {
  it('stores every ERC-20 as a valid EIP-55 checksummed address', () => {
    for (const t of BASE_TOKENS) {
      if (t.address === NATIVE_TOKEN_ADDRESS) continue; // native sentinel is exempt
      expect(getAddress(t.address), `${t.symbol} must be checksummed`).toBe(t.address);
    }
  });

  it('has sane decimals (0–18) and a non-empty symbol + name on every entry', () => {
    for (const t of BASE_TOKENS) {
      expect(t.decimals, `${t.symbol} decimals`).toBeGreaterThanOrEqual(0);
      expect(t.decimals, `${t.symbol} decimals`).toBeLessThanOrEqual(18);
      expect(t.symbol.length, `${t.symbol} symbol`).toBeGreaterThan(0);
      expect(t.name.length, `${t.symbol} name`).toBeGreaterThan(0);
    }
  });

  it('contains no duplicate addresses or symbols', () => {
    const addrs = BASE_TOKENS.map((t) => t.address.toLowerCase());
    const syms = BASE_TOKENS.map((t) => t.symbol.toLowerCase());
    expect(new Set(addrs).size, 'duplicate address').toBe(addrs.length);
    expect(new Set(syms).size, 'duplicate symbol').toBe(syms.length);
  });
});

describe('searchTokens edge cases', () => {
  it('finds by exact address', () => {
    expect(searchTokens('0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42')[0]?.symbol).toBe('EURC');
  });

  it('returns the full registry for an empty query and [] for no match', () => {
    expect(searchTokens('')).toHaveLength(BASE_TOKENS.length);
    expect(searchTokens('zzz-not-a-token')).toEqual([]);
  });
});

describe('toChecksum', () => {
  it('checksums a lowercased address and throws on garbage', () => {
    expect(toChecksum('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')).toBe(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    );
    expect(() => toChecksum('nope')).toThrow(/invalid address/i);
  });
});
