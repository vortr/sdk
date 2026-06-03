import { describe, expect, it } from 'vitest';
import { createAggregator } from './index.js';
import { ZeroExAggregator } from './zeroEx.js';

describe('createAggregator', () => {
  it('returns a 0x aggregator by default', () => {
    expect(createAggregator({ provider: 'zeroex', apiKey: 'k' })).toBeInstanceOf(ZeroExAggregator);
  });

  it('throws for an unknown provider', () => {
    // @ts-expect-error invalid provider on purpose
    expect(() => createAggregator({ provider: 'nope', apiKey: 'k' })).toThrow(/unknown aggregator/i);
  });
});
