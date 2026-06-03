import type { QuoteParams, QuoteResult } from '../types.js';

export interface Aggregator {
  /** Firm, executable quote (returns transaction calldata). */
  quote(params: QuoteParams): Promise<QuoteResult>;
}
