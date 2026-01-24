// server/gs1.ts

/**
 * Calculates the GS1 Check Digit using the Modulo 10 algorithm.
 * This is the standard "Luhn" style check used in barcodes.
 */
function calculateCheckDigit(digits: string): number {
  let sum = 0;
  // Loop through digits from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = parseInt(digits[i]);
    // Odd positions (from right) multiply by 3, Even by 1
    // Since arrays are 0-indexed, we check parity of (length - 1 - i)
    const weight = (digits.length - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  
  const nearestTen = Math.ceil(sum / 10) * 10;
  return nearestTen - sum;
}

/**
 * Generates a valid 18-digit SSCC.
 * @param companyPrefix - Your GS1 Company Prefix (e.g., "1234567")
 * @param serialRef - A unique number for this specific carton
 */
export function generateSSCC(companyPrefix: string, serialRef: number): string {
  const extensionDigit = "0";
  
  // Pad the serial reference with zeros to ensure total length fits
  // Total length excluding check digit must be 17
  // 1 (Ext) + Prefix Length + Serial Length = 17
  const requiredSerialLength = 17 - 1 - companyPrefix.length;
  const serialString = serialRef.toString().padStart(requiredSerialLength, "0");
  
  const rawCode = `${extensionDigit}${companyPrefix}${serialString}`;
  const checkDigit = calculateCheckDigit(rawCode);
  
  return `${rawCode}${checkDigit}`;
}