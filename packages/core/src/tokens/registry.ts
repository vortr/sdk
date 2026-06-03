import { getAddress, isAddress, type Address } from 'viem';
import { BASE_CHAIN_ID } from '../chains.js';
import { NATIVE_TOKEN_ADDRESS, type TokenInfo } from '../types.js';

export const BASE_TOKENS: TokenInfo[] = [
  { chainId: BASE_CHAIN_ID, address: NATIVE_TOKEN_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
  { chainId: BASE_CHAIN_ID, address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  { chainId: BASE_CHAIN_ID, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { chainId: BASE_CHAIN_ID, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  { chainId: BASE_CHAIN_ID, address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  { chainId: BASE_CHAIN_ID, address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', decimals: 8 },
];

const BY_ADDRESS = new Map<string, TokenInfo>(
  BASE_TOKENS.map((t) => [t.address.toLowerCase(), t]),
);

export function getToken(address: string): TokenInfo | undefined {
  return BY_ADDRESS.get(address.toLowerCase());
}

export function isBaseToken(address: string): boolean {
  return isAddress(address) && BY_ADDRESS.has(address.toLowerCase());
}

export function searchTokens(query: string): TokenInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return BASE_TOKENS;
  return BASE_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase() === q,
  );
}

/** Checksum an address, or throw if malformed. */
export function toChecksum(address: string): Address {
  if (!isAddress(address)) throw new Error(`invalid address: ${address}`);
  return getAddress(address);
}
