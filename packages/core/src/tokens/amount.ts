import { parseUnits, formatUnits } from 'viem';

/** Human decimal string -> base-units string. Throws on bad input or excess precision. */
export function parseAmount(human: string, decimals: number): string {
  const trimmed = human.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`invalid amount: ${human}`);
  }
  const fractional = trimmed.split('.')[1];
  if (fractional && fractional.length > decimals) {
    throw new Error(`too many decimal places for a ${decimals}-decimal token`);
  }
  return parseUnits(trimmed, decimals).toString();
}

/** Base-units string -> human decimal string (no trailing zeros). */
export function formatAmount(baseUnits: string, decimals: number): string {
  return formatUnits(BigInt(baseUnits), decimals);
}
