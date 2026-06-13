// PayNow / SGQR (EMVCo) payload builder + validators.
//
// Produces the EMVCo TLV string that, when rendered as a QR code, is a genuine,
// scannable Singapore PayNow QR. Mirrors the behaviour of public PayNow QR
// generators (e.g. fullstacksys.com/paynow-qr-code-generator).

// --- EMVCo TLV helper -------------------------------------------------------
// id + 2-digit length + value
function tlv(id, value) {
  const v = String(value);
  return `${id}${String(v.length).padStart(2, '0')}${v}`;
}

// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflect, no xorout.
// Computed over the whole payload including the literal "6304" tag+length.
export function crc16(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// --- Mobile helpers ---------------------------------------------------------
// Strip everything but digits, drop a leading 65 country code if present.
export function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.replace(/^65(?=[89]\d{7}$)/, '');
}

// Returns the PayNow proxy form for a mobile number, e.g. "+6591234567".
export function toPayNowMobile(value) {
  const digits = normalizeMobile(value);
  return digits ? `+65${digits}` : '';
}

// --- Validators (return '' when valid, else an error message) ---------------
export function validateUEN(value) {
  const v = String(value || '').trim();
  if (!v) return 'UEN is required';
  if (!/^[A-Za-z0-9]{8,10}$/.test(v)) return 'Enter a valid UEN (e.g. 201912345A)';
  return '';
}

export function validateMobile(value) {
  const digits = normalizeMobile(value);
  if (!digits) return 'Mobile number is required';
  if (!/^[89]\d{7}$/.test(digits)) return 'Enter a valid Singapore mobile (e.g. 9123 4567)';
  return '';
}

export function validateReference(value) {
  const v = String(value || '');
  if (!/^[a-zA-Z0-9]*$/.test(v)) return 'Only letters and numbers (a-z, A-Z, 0-9) are allowed';
  if (v.length > 25) return 'Maximum 25 characters';
  return '';
}

// `required` => amount must be present and > 0 (when the amount is not editable).
export function validateAmount(value, { required = false } = {}) {
  if (value === '' || value == null) {
    return required ? 'Amount is required' : '';
  }
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return 'Enter a valid amount greater than 0';
  if (n > 999999.99) return 'Amount is too large';
  return '';
}

export function validateExpiry(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  if (d.getTime() <= Date.now()) return 'Expiry must be in the future';
  return '';
}

// --- Payload builder --------------------------------------------------------
// Fields:
//   proxyType    'UEN' | 'MOBILE'
//   proxyValue   UEN string, or a mobile in "+65########" form
//   editable     boolean — may the payer edit the amount?
//   amount       number | string | null
//   merchantName company / display name (defaults to "NA")
//   reference    bill / reference number ('' to omit)
//   expiry       'YYYYMMDD' ('' to omit)
export function buildPayNowPayload({
  proxyType,
  proxyValue,
  editable = true,
  amount = null,
  merchantName = '',
  reference = '',
  expiry = '',
} = {}) {
  const isUEN = proxyType === 'UEN';

  const amt =
    amount !== '' && amount != null && Number(amount) > 0 ? Number(amount) : null;
  const hasAmount = amt !== null;

  // Merchant Account Information template (tag 26)
  const merchantAccount =
    tlv('00', 'SG.PAYNOW') +
    tlv('01', isUEN ? '2' : '0') +
    tlv('02', proxyValue) +
    tlv('03', editable ? '1' : '0') +
    (expiry ? tlv('04', expiry) : '');

  const name = merchantName && merchantName.trim() ? merchantName.trim().slice(0, 25) : 'NA';

  let payload =
    tlv('00', '01') +
    // 11 = static/reusable, 12 = dynamic (single fixed payment)
    tlv('01', !editable && hasAmount ? '12' : '11') +
    tlv('26', merchantAccount) +
    tlv('52', '0000') + // Merchant Category Code (unspecified)
    tlv('53', '702') + // Currency: SGD
    (hasAmount ? tlv('54', amt.toFixed(2)) : '') +
    tlv('58', 'SG') + // Country
    tlv('59', name) + // Merchant name
    tlv('60', 'Singapore') + // Merchant city
    (reference ? tlv('62', tlv('01', reference)) : ''); // Additional data -> Bill number

  payload += '6304'; // CRC tag + length
  payload += crc16(payload);
  return payload;
}
