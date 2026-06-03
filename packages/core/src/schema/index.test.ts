import { describe, expect, it } from 'vitest';
import { quoteParamsSchema } from './index.js';

const valid = {
  chainId: 8453,
  sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  buyToken: '0x4200000000000000000000000000000000000006',
  sellAmount: '1000000',
  taker: '0x1111111111111111111111111111111111111111',
};

describe('quoteParamsSchema', () => {
  it('accepts valid base-units params', () => {
    expect(quoteParamsSchema.parse(valid)).toMatchObject({ chainId: 8453 });
  });

  it('rejects a non-Base chainId', () => {
    expect(() => quoteParamsSchema.parse({ ...valid, chainId: 1 })).toThrow();
  });

  it('rejects a decimal (non-base-units) sellAmount', () => {
    expect(() => quoteParamsSchema.parse({ ...valid, sellAmount: '1.5' })).toThrow();
  });

  it('rejects a malformed address', () => {
    expect(() => quoteParamsSchema.parse({ ...valid, taker: '0xabc' })).toThrow();
  });

  it('rejects slippageBps above 1000', () => {
    expect(() => quoteParamsSchema.parse({ ...valid, slippageBps: 1500 })).toThrow();
  });
});
