import { describe, expect, it } from 'vitest';
import { decodeFunctionData, erc20Abi, getAddress } from 'viem';
import { buildSwapCalls } from './buildSwapCalls.js';
import { NATIVE_TOKEN_ADDRESS, type QuoteResult } from '../types.js';

const TAKER = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH = '0x4200000000000000000000000000000000000006';
const SPENDER = '0x0000000000001fF3684f28c67538d4D072C22734';

function baseQuote(over: Partial<QuoteResult> = {}): QuoteResult {
  return {
    chainId: 8453, sellToken: USDC, buyToken: WETH, taker: TAKER,
    sellAmount: '1000000', buyAmount: '500000000000000', minBuyAmount: '497500000000000',
    allowanceTarget: SPENDER, allowanceActual: '0',
    transaction: { to: SPENDER, data: '0xdeadbeef', value: '0' },
    liquidityAvailable: true,
    ...over,
  };
}

describe('buildSwapCalls', () => {
  it('builds [approve, swap] when allowance is insufficient', () => {
    const { payload, summary } = buildSwapCalls(baseQuote(), { nowMs: 1000, ttlMs: 30000 });

    expect(payload.chain).toBe('base');
    expect(payload.from).toBe(getAddress(TAKER));
    expect(payload.calls).toHaveLength(2);

    const [approve, swap] = payload.calls as [typeof payload.calls[0], typeof payload.calls[0]];
    expect(approve.to).toBe(getAddress(USDC));
    expect(approve.value).toBe('0x0');
    expect(approve.data.startsWith('0x095ea7b3')).toBe(true); // approve(address,uint256)
    const decoded = decodeFunctionData({ abi: erc20Abi, data: approve!.data });
    expect(decoded.functionName).toBe('approve');
    expect(decoded.args![0]).toBe(getAddress(SPENDER));
    expect(decoded.args![1]).toBe(1000000n);

    expect(swap.to).toBe(getAddress(SPENDER));
    expect(swap.data).toBe('0xdeadbeef');
    expect(swap.value).toBe('0x0');

    expect(summary.taker).toBe(getAddress(TAKER));
    expect(summary.expiresAt).toBe(31000);
    expect(summary.buyMin.amount).toBe('497500000000000');
    // expected (pre-slippage) out, so consumers can show "≈ expected (min …)"
    expect(summary.buy).toEqual({ token: WETH, amount: '500000000000000' });
  });

  it('skips approve for native ETH sells', () => {
    const { payload } = buildSwapCalls(
      baseQuote({ sellToken: NATIVE_TOKEN_ADDRESS, transaction: { to: SPENDER, data: '0xfeed', value: '1000000' } }),
      { nowMs: 0 },
    );
    expect(payload.calls).toHaveLength(1);
    expect(payload.calls[0]!.value).toBe('0xf4240'); // 1_000_000 wei
  });

  it('skips approve when existing allowance is sufficient', () => {
    const { payload } = buildSwapCalls(baseQuote({ allowanceActual: '1000000' }), { nowMs: 0 });
    expect(payload.calls).toHaveLength(1);
    expect(payload.calls[0]!.data).toBe('0xdeadbeef');
  });

  it('throws fail-closed when liquidity is unavailable', () => {
    expect(() => buildSwapCalls(baseQuote({ liquidityAvailable: false }), { nowMs: 0 })).toThrow(/liquidity/i);
  });

  it('throws when price impact exceeds the ceiling', () => {
    expect(() => buildSwapCalls(baseQuote({ estimatedPriceImpactBps: 9999 }), { nowMs: 0 })).toThrow(/price impact/i);
  });
});
