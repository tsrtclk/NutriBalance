/**
 * Supported currencies for wallets and transactions.
 *
 * Extensible — add new currencies here as the platform expands. The schema's
 * wallet_balances table uses (wallet_id, currency) UNIQUE, so adding a
 * currency is a data-only change with no migration needed.
 */
export const SUPPORTED_CURRENCIES = ["TRY", "EUR", "BGN", "RON"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const PRIMARY_CURRENCY: Currency = "TRY";

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Money amount as string — preserves DECIMAL(15,2) precision over the wire.
 * Never parse into a JS Number for financial calculations; use a Decimal
 * library (e.g. decimal.js) on the consumer side if math is needed.
 */
export type MoneyAmount = string;
