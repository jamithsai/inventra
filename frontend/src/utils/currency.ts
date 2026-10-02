/**
 * Centralized Indian Rupee (INR / ₹) Currency Formatting Utilities for INVENTRA.
 * Enforces native Indian numbering system (en-IN) and consistent formatting across all components.
 */

/**
 * Formats a numeric value into Indian Rupees (INR) using Indian numbering system.
 * 
 * Examples:
 *  - 899 -> ₹899 or ₹899.00 (depending on decimals)
 *  - 1299 -> ₹1,299
 *  - 100000 -> ₹1,00,000
 *  - 1250000 -> ₹12,50,000
 */
export function formatINR(
  value: number | null | undefined,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    hideDecimalsIfWhole?: boolean;
  } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    hideDecimalsIfWhole = true,
  } = options;

  const isWhole = Number.isInteger(value);
  const minDigits = hideDecimalsIfWhole && isWhole ? 0 : minimumFractionDigits;
  const maxDigits = hideDecimalsIfWhole && isWhole ? 0 : maximumFractionDigits;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(value);
  } catch {
    // Fallback in environments without full en-IN Intl support
    const formattedNum = Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    return `₹${formattedNum}`;
  }
}

/**
 * Formats large monetary values into compact Indian notation (K, L / Lakh, Cr / Crore).
 * Ideal for chart Y-axes, compact badges, and dashboard headers.
 * 
 * Examples:
 *  - 950 -> ₹950
 *  - 50000 -> ₹50K
 *  - 100000 -> ₹1L
 *  - 1500000 -> ₹15L
 *  - 10000000 -> ₹1Cr
 *  - 25000000 -> ₹2.5Cr
 */
export function formatCompactINR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    const lakh = abs / 100000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)}L`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }

  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
