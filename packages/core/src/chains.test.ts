import { describe, expect, it } from 'vitest';
import { chainIdToChainName, BASE_CHAIN_ID } from './chains.js';

describe('chainIdToChainName', () => {
  it('maps Base chainId to the chain name', () => {
    expect(chainIdToChainName(BASE_CHAIN_ID)).toBe('base');
  });

  it('throws for an unsupported chain', () => {
    expect(() => chainIdToChainName(1)).toThrow(/unsupported chain/i);
  });
});
