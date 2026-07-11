/** Combine street address and pincode for API storage (single `address` column). */
export function formatAddressWithPincode(addressLine, pincode) {
  const line = String(addressLine || '').trim();
  const pin = String(pincode || '').trim();
  if (!line && !pin) return '';
  if (!pin) return line;
  if (!line) return `PIN: ${pin}`;
  return `${line}\nPIN: ${pin}`;
}

/** Split a stored address that may include a trailing `PIN: ######` line. */
export function parseAddressWithPincode(stored) {
  const raw = String(stored || '').trim();
  if (!raw) return { address_line: '', pincode: '' };
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const pinLine = lines.find((l) => /^PIN:\s*\d{6}\s*$/i.test(l));
  const pincode = pinLine ? pinLine.replace(/^PIN:\s*/i, '').trim() : '';
  const address_line = lines
    .filter((l) => !/^PIN:\s*\d{6}\s*$/i.test(l))
    .join('\n')
    .trim();
  return { address_line, pincode };
}
