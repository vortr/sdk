import type { Address, Hex } from 'viem';
import { zeroAddress } from 'viem';
import type { QuoteParams, QuoteResult } from '../types.js';
import type { Aggregator } from './types.js';

const BASE_URL = 'https://api.0x.org';

type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
}>;

export interface ZeroExOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

export class ZeroExAggregator implements Aggregator {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(opts: ZeroExOptions) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.baseUrl = opts.baseUrl ?? BASE_URL;
  }

  async quote(params: QuoteParams): Promise<QuoteResult> {
    const url = new URL('/swap/allowance-holder/quote', this.baseUrl);
    url.searchParams.set('chainId', String(params.chainId));
    url.searchParams.set('sellToken', params.sellToken);
    url.searchParams.set('buyToken', params.buyToken);
    url.searchParams.set('sellAmount', params.sellAmount);
    url.searchParams.set('taker', params.taker);
    if (params.slippageBps != null) {
      url.searchParams.set('slippageBps', String(params.slippageBps));
    }

    const res = await this.fetchImpl(url.toString(), {
      headers: { '0x-api-key': this.apiKey, '0x-version': 'v2' },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`0x quote failed (${res.status}): ${detail}`);
    }

    const j = await res.json();

    if (!j.liquidityAvailable) {
      return {
        chainId: params.chainId,
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        taker: params.taker,
        sellAmount: j.sellAmount ?? params.sellAmount,
        buyAmount: '0',
        minBuyAmount: '0',
        allowanceTarget: zeroAddress,
        allowanceActual: '0',
        transaction: {
          to: zeroAddress,
          data: '0x' as Hex,
          value: '0',
        },
        liquidityAvailable: false,
      };
    }

    const allowanceTarget: Address =
      j.allowanceTarget ?? j.issues?.allowance?.spender;

    if (!j.transaction?.to || !j.buyAmount || !j.minBuyAmount || !allowanceTarget) {
      throw new Error('0x quote response missing required fields');
    }

    const route = mapRoute(j.route);

    return {
      chainId: params.chainId,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      taker: params.taker,
      sellAmount: j.sellAmount ?? params.sellAmount,
      buyAmount: j.buyAmount,
      minBuyAmount: j.minBuyAmount,
      allowanceTarget,
      allowanceActual: j.issues?.allowance?.actual ?? '0',
      transaction: {
        to: j.transaction.to as Address,
        data: j.transaction.data as Hex,
        value: j.transaction.value ?? '0',
        gas: j.transaction.gas,
      },
      liquidityAvailable: true,
      estimatedPriceImpactBps:
        typeof j.estimatedPriceImpactBps === 'number'
          ? j.estimatedPriceImpactBps
          : undefined,
      totalNetworkFee: j.totalNetworkFee,
      ...(route ? { route } : {}),
    };
  }
}

/**
 * Map the 0x v2 `route` object (fills + tokens) to our shape. Tolerates missing
 * or malformed input — returns undefined when there's nothing usable so the
 * field is simply omitted from the quote.
 */
function mapRoute(raw: unknown): QuoteResult['route'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { fills?: unknown; tokens?: unknown };

  const fills = Array.isArray(r.fills)
    ? r.fills
        .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
        .map((f) => ({
          source: String(f.source ?? ''),
          from: String(f.from ?? ''),
          to: String(f.to ?? ''),
          proportionBps: String(f.proportionBps ?? ''),
        }))
    : [];

  const tokens = Array.isArray(r.tokens)
    ? r.tokens
        .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
        .map((t) => ({
          address: String(t.address ?? ''),
          symbol: String(t.symbol ?? ''),
        }))
    : [];

  if (fills.length === 0 && tokens.length === 0) return undefined;
  return { fills, tokens };
}
