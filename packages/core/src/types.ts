import type { Address, Hex } from 'viem';

/** 0x sentinel for native ETH. */
export const NATIVE_TOKEN_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

export interface TokenInfo {
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface QuoteParams {
  chainId: number;
  sellToken: Address;
  buyToken: Address;
  /** Sell amount in base-units (stringified bigint). Exact-input only in v1. */
  sellAmount: string;
  taker: Address;
  slippageBps?: number;
}

export interface QuoteResult {
  chainId: number;
  sellToken: Address;
  buyToken: Address;
  taker: Address;
  sellAmount: string;
  buyAmount: string;
  /** Slippage floor; already post-fee/post-slippage from 0x. */
  minBuyAmount: string;
  /** Spender to approve (issues.allowance.spender / allowanceTarget). */
  allowanceTarget: Address;
  /** Current on-chain allowance for the spender, base-units. '0' if unknown. */
  allowanceActual: string;
  transaction: { to: Address; data: Hex; value: string; gas?: string };
  liquidityAvailable: boolean;
  estimatedPriceImpactBps?: number;
  /** Optional/best-effort; not populated by the 0x adapter — reserved for fee-aware providers. */
  feeBps?: number;
  totalNetworkFee?: string;
  /**
   * The aggregator's per-hop fill route, surfaced for routing visualizations.
   * `proportionBps` is a STRING in basis-points; consumers do Number(bps)/100 =
   * percent, normalized PER-HOP (each `from→to` leg sums to 100% across sources).
   */
  route?: {
    fills: { source: string; from: string; to: string; proportionBps: string }[];
    tokens: { address: string; symbol: string }[];
  };
}

/** One ERC-5792 call in a `wallet_sendCalls` batch. */
export interface Call {
  to: Address;
  data: Hex;
  value: Hex;
}

/** Exact ERC-5792 `wallet_sendCalls` payload. `atomicRequired` is omitted on purpose. */
export interface SendCallsPayload {
  chain: string;
  from: Address;
  calls: Call[];
}

export interface SwapSummary {
  sell: { token: Address; amount: string };
  /** EXPECTED out (0x `buyAmount`, pre-slippage) — the amount you'll most likely
   *  receive. Show this as the headline; `buyMin` is only the worst-case floor.
   *  Optional so older callers/servers that omit it degrade gracefully. */
  buy?: { token: Address; amount: string };
  /** Guaranteed minimum out (0x `minBuyAmount`, post-slippage floor). */
  buyMin: { token: Address; amount: string };
  estimatedPriceImpactBps?: number;
  feeBps?: number;
  taker: Address;
  /** Epoch ms after which the agent/UI must re-run build_swap. */
  expiresAt: number;
}

export interface BuildSwapResult {
  payload: SendCallsPayload;
  summary: SwapSummary;
}
