export const BASE_CHAIN_ID = 8453 as const;

const CHAIN_NAMES: Record<number, string> = {
  [BASE_CHAIN_ID]: 'base',
};

export function chainIdToChainName(chainId: number): string {
  const name = CHAIN_NAMES[chainId];
  if (!name) throw new Error(`unsupported chain: ${chainId}`);
  return name;
}
