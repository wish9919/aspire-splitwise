/**
 * Format currency amount for display
 * @param amount - The amount to format
 * @param currency - The currency code (defaults to LKR)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = "LKR"
): string => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Parse currency string to number
 * @param currencyString - The currency string to parse
 * @returns Parsed number
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbols and parse as number
  return parseFloat(currencyString.replace(/[^\d.-]/g, ""));
};

/**
 * Get currency symbol
 * @param currency - The currency code
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = "LKR"): string => {
  const symbols: Record<string, string> = {
    LKR: "Rs.",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  return symbols[currency] || currency;
};
