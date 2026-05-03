/**
 * Safely convert a raw token balance string to human-readable decimal amount
 * using BigInt to avoid floating-point precision loss for large values.
 *
 * @param rawBalance - Raw balance string from blockchain (e.g., "1000000000000000000")
 * @param decimals - Token decimals (e.g., 18 for JST, 6 for USDT)
 * @returns Human-readable decimal amount string
 */
export function formatTokenBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === "0") return "0.00";

  try {
    // Use BigInt for precise calculation
    const balanceBigInt = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);

    // Split into integer and fractional parts
    const integerPart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;

    // Format fractional part with proper padding
    let fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    // Trim trailing zeros but keep at least 2 digits for display
    fractionalStr = fractionalStr.slice(0, Math.max(2, fractionalStr.length));
    // Remove trailing zeros beyond minimum 2 digits
    while (fractionalStr.length > 2 && fractionalStr.endsWith("0")) {
      fractionalStr = fractionalStr.slice(0, -1);
    }

    const formatted = `${integerPart}.${fractionalStr}`;

    // Apply locale formatting for readability
    const [int, frac] = formatted.split(".");
    return `${BigInt(int).toLocaleString("en-US")}.${frac}`;
  } catch {
    // Fallback to parseFloat if BigInt fails (e.g., decimal input)
    const num = parseFloat(rawBalance);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: decimals });
  }
}

/**
 * Convert human-readable amount to raw balance for sending
 * Uses BigInt to avoid precision loss for tokens with high decimals
 *
 * @param amount - Human-readable amount string (e.g., "1.5")
 * @param decimals - Token decimals
 * @returns Raw balance string for blockchain
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  if (!amount || amount.trim() === "") return "0";

  const trimmed = amount.trim();
  const dotIndex = trimmed.indexOf(".");
  const hasDecimal = dotIndex >= 0;

  try {
    if (hasDecimal) {
      const integerPart = trimmed.slice(0, dotIndex) || "0";
      const fractionalPart = trimmed.slice(dotIndex + 1);

      // Pad or truncate fractional part to match decimals
      let adjustedFraction = fractionalPart;
      if (adjustedFraction.length > decimals) {
        adjustedFraction = adjustedFraction.slice(0, decimals);
      } else {
        adjustedFraction = adjustedFraction.padEnd(decimals, "0");
      }

      const rawStr = `${integerPart}${adjustedFraction}`;
      return BigInt(rawStr).toString();
    } else {
      // No decimal point, multiply by 10^decimals
      const rawStr = `${trimmed}${"0".repeat(decimals)}`;
      return BigInt(rawStr).toString();
    }
  } catch {
    // Fallback to parseFloat for edge cases
    const num = parseFloat(trimmed);
    if (isNaN(num)) return "0";
    return Math.floor(num * Math.pow(10, decimals)).toString();
  }
}

/**
 * Get a numeric representation of the balance for display purposes
 * Returns a number that can be used for comparisons and simple display
 * Note: May have precision loss for very large balances - use formatTokenBalance for display
 */
export function getNumericBalance(rawBalance: string, decimals: number): number {
  if (!rawBalance || rawBalance === "0") return 0;

  try {
    const balanceBigInt = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const integerPart = Number(balanceBigInt / divisor);

    // For large balances, return integer part only to avoid precision loss
    if (integerPart >= 1e15) return integerPart;

    // For smaller balances, we can safely use floating point
    return Number(balanceBigInt) / Math.pow(10, decimals);
  } catch {
    return parseFloat(rawBalance) || 0;
  }
}