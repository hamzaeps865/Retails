// Money helpers for handling currency in integer minor units (paisa)

export const PKR_MINOR_UNITS = 100;

/**
 * Convert standard currency format (e.g., rupees) to minor units (e.g., paisa).
 * Used before saving to the database.
 * @param major - Amount in major units (e.g., 50.50)
 * @returns Amount in minor units (e.g., 5050)
 */
export function toMinor(major: number): number {
  return Math.round(major * PKR_MINOR_UNITS);
}

/**
 * Convert minor units (e.g., paisa) to standard currency format.
 * Used before displaying to the user.
 * @param minor - Amount in minor units (e.g., 5050)
 * @returns Amount in major units (e.g., 50.50)
 */
export function fromMinor(minor: number): number {
  return minor / PKR_MINOR_UNITS;
}

/**
 * Format minor units into a readable string in PKR.
 * @param minor - Amount in minor units
 * @returns Formatted string (e.g., "Rs. 50.50")
 */
export function formatPKR(minor: number): string {
  const major = fromMinor(minor);
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
  }).format(major);
}
