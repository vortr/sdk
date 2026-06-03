import type { Aggregator } from './types.js';
import { ZeroExAggregator } from './zeroEx.js';

export type AggregatorProvider = 'zeroex';

export interface CreateAggregatorOptions {
  provider?: AggregatorProvider;
  apiKey: string;
  fetchImpl?: ConstructorParameters<typeof ZeroExAggregator>[0]['fetchImpl'];
  baseUrl?: string;
}

export function createAggregator(opts: CreateAggregatorOptions): Aggregator {
  const provider = opts.provider ?? 'zeroex';
  switch (provider) {
    case 'zeroex':
      return new ZeroExAggregator({ apiKey: opts.apiKey, fetchImpl: opts.fetchImpl, baseUrl: opts.baseUrl });
    default:
      throw new Error(`unknown aggregator provider: ${provider}`);
  }
}

export * from './types.js';
export { ZeroExAggregator } from './zeroEx.js';
