/** Combine street address and pincode for API storage (single `address` column). */
export function formatAddressWithPincode(addressLine, pincode) {
  const line = String(addressLine || '').trim();
  const pin = String(pincode || '').trim();
  if (!line && !pin) return '';
  if (!pin) return line;
  if (!line) return `PIN: ${pin}`;
  return `${line}\nPIN: ${pin}`;
}
