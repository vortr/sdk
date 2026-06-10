import { describe, expect, it } from 'vitest';
import { searchTokensHandler, getQuoteHandler, buildSwapHandler, getPortfolioHandler } from './handlers.js';

const fakeClient = {
  postQuote: async () => ({ buyAmount: '5', minBuyAmount: '4', estimatedPriceImpactBps: 10, route: [] }),
  postBuildSwap: async () => ({ payload: { chain: 'base', from: '0x1', calls: [] }, summary: { taker: '0x1', expiresAt: 123 } }),
  getPortfolio: async () => ({ tokens: [] }),
} as any;

describe('searchTokensHandler', () => {
  it('returns matching tokens from core (no network)', async () => {
    const out = await searchTokensHandler({ query: 'usdc' }, { client: fakeClient });
    expect(JSON.stringify(out)).toMatch(/USDC/);
  });
});

describe('getQuoteHandler', () => {
  it('rejects a non-Base token before calling the API', async () => {
    await expect(
      getQuoteHandler({ sellToken: '0x0000000000000000000000000000000000000001', buyToken: '0x4200000000000000000000000000000000000006', amount: '1', taker: '0x1111111111111111111111111111111111111111' }, { client: fakeClient }),
    ).rejects.toThrow(/not a known Base token/i);
  });
  it('returns the quote for valid Base tokens', async () => {
    const out = await getQuoteHandler({ sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', buyToken: '0x4200000000000000000000000000000000000006', amount: '1000000', taker: '0x1111111111111111111111111111111111111111' }, { client: fakeClient });
    expect(JSON.stringify(out)).toMatch(/minBuyAmount/);
  });
  it('rejects a non-base-units amount (decimal) before calling the API', async () => {
    await expect(
      getQuoteHandler({ sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', buyToken: '0x4200000000000000000000000000000000000006', amount: '1.5', taker: '0x1111111111111111111111111111111111111111' }, { client: fakeClient }),
    ).rejects.toThrow(/base units/i);
  });
});

describe('buildSwapHandler', () => {
  it('returns the ERC-5792 payload + taker + expiresAt and a usage hint', async () => {
    const out = await buildSwapHandler({ sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', buyToken: '0x4200000000000000000000000000000000000006', amount: '1000000', taker: '0x1111111111111111111111111111111111111111' }, { client: fakeClient });
    const text = JSON.stringify(out);
    expect(text).toMatch(/@vortr\/wallet/);
    expect(text).toMatch(/expiresAt/);
  });
  it('rejects a non-base-units amount before building (no API call)', async () => {
    await expect(
      buildSwapHandler({ sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', buyToken: '0x4200000000000000000000000000000000000006', amount: '1.5', taker: '0x1111111111111111111111111111111111111111' }, { client: fakeClient }),
    ).rejects.toThrow(/base units/i);
  });
});

describe('getPortfolioHandler', () => {
  it('returns portfolio content containing tokens', async () => {
    const out = await getPortfolioHandler({ address: '0x1111111111111111111111111111111111111111' }, { client: fakeClient });
    expect(JSON.stringify(out)).toMatch(/tokens/);
  });
  it('rejects an invalid address', async () => {
    await expect(
      getPortfolioHandler({ address: '0xabc' }, { client: fakeClient }),
    ).rejects.toThrow(/not a valid address/);
  });
});
