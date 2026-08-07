/**
 * Delivery pricing — shared by the merchant console, the API validation layer
 * and the storefront quote.
 *
 * This module is deliberately dependency-free and pure so the same code decides
 * the price in the merchant's "test a postcode" box and on the server. If the
 * two ever disagreed, a merchant would quote one price and get charged another.
 *
 * ---------------------------------------------------------------------------
 * How a Singapore address becomes a region
 * ---------------------------------------------------------------------------
 * Singapore postal codes are six digits, and the first two are the "sector",
 * which maps to a known geographic area. We resolve region from the sector
 * alone — no geocoding service, no API key, no network call, and no dependency
 * that can rate-limit or go down mid-checkout.
 *
 * Singapore's official planning regions are Central, East, North, North-East
 * and West. This maps onto four compass buckets instead, because that is what
 * merchants price against in practice. Two judgement calls follow from that:
 *
 *   - Central / city-centre sectors (Raffles Place through Orchard) resolve to
 *     SOUTH. The CBD sits on the southern coast, and it is the shorter drive
 *     from most southern kitchens.
 *   - North-East sectors (Hougang, Sengkang, Punggol) resolve to NORTH, which
 *     is the closer of the two available buckets.
 *
 * Both are documented in SECTOR_REGIONS below so they can be re-cut without
 * hunting through the code.
 */

export const DELIVERY_REGIONS = ['north', 'south', 'east', 'west'];

export const REGION_LABELS = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
};

/**
 * Postal sector (first two digits) -> region.
 *
 * Ranges are inclusive on both ends. Sector 74 is not issued. Anything outside
 * 01-82 is not a Singapore postal code and resolves to null rather than being
 * silently bucketed.
 */
const SECTOR_REGIONS = [
  // --- South: CBD, Marina, Tanjong Pagar, Harbourfront -------------------
  { from: 1, to: 10, region: 'south', area: 'City & Harbourfront' },
  // --- West: Pasir Panjang, Clementi -------------------------------------
  { from: 11, to: 13, region: 'west', area: 'Pasir Panjang, Clementi' },
  // --- South: Queenstown, Tiong Bahru, Alexandra, Beach Road -------------
  { from: 14, to: 19, region: 'south', area: 'Queenstown, Tiong Bahru, Beach Road' },
  // --- South (central): Little India, Farrer Park, Orchard, River Valley --
  { from: 20, to: 23, region: 'south', area: 'Little India, Orchard, River Valley' },
  // --- West: Bukit Timah, Holland, Tanglin --------------------------------
  { from: 24, to: 27, region: 'west', area: 'Bukit Timah, Holland, Tanglin' },
  // --- North: Novena, Thomson, Balestier, Toa Payoh ----------------------
  { from: 28, to: 33, region: 'north', area: 'Novena, Thomson, Toa Payoh' },
  // --- East: Macpherson, Braddell, Geylang, Eunos, Katong ----------------
  { from: 34, to: 45, region: 'east', area: 'Macpherson, Geylang, Katong' },
  // --- East: Bedok, Upper East Coast, Loyang, Changi, Tampines, Pasir Ris -
  { from: 46, to: 52, region: 'east', area: 'Bedok, Changi, Tampines, Pasir Ris' },
  // --- North: Serangoon Gardens, Hougang, Sengkang (north-east) ----------
  { from: 53, to: 55, region: 'north', area: 'Serangoon Gardens, Hougang, Sengkang' },
  // --- North: Bishan, Ang Mo Kio -----------------------------------------
  { from: 56, to: 57, region: 'north', area: 'Bishan, Ang Mo Kio' },
  // --- West: Upper Bukit Timah, Clementi Park, Jurong, Tuas, Bukit Batok --
  { from: 58, to: 71, region: 'west', area: 'Bukit Batok, Jurong, Choa Chu Kang' },
  // --- North: Kranji, Woodlands, Yishun, Sembawang, Seletar --------------
  { from: 72, to: 80, region: 'north', area: 'Woodlands, Yishun, Sembawang' },
  // --- East: Changi / Loyang tail ----------------------------------------
  { from: 81, to: 81, region: 'east', area: 'Changi, Loyang' },
  // --- North: Punggol -----------------------------------------------------
  { from: 82, to: 82, region: 'north', area: 'Punggol' },
];

/**
 * Pulls a Singapore postal code out of whatever the user typed.
 *
 * Accepts a bare code ("529510"), a spaced code ("52 9510"), or a full address
 * with the code somewhere inside it ("123 Bedok North Ave 1, Singapore 460123").
 * We do not geocode free-text addresses — that would mean an external service
 * on the checkout path — so an address without a postal code in it returns null
 * and the caller asks for the code.
 */
export function extractPostalCode(input) {
  if (typeof input !== 'string') return null;

  const compact = input.replace(/[\s-]/g, '');

  // A bare six-digit string is the common case.
  if (/^\d{6}$/.test(compact)) return compact;

  // Otherwise look for a standalone six-digit run, preferring one that follows
  // "Singapore" / "S" since that is how addresses are written locally.
  const tagged = input.match(/(?:singapore|sing|s)[\s(]*(\d{6})\b/i);
  if (tagged) return tagged[1];

  const loose = compact.match(/(?<!\d)(\d{6})(?!\d)/);
  return loose ? loose[1] : null;
}

/** Region for a six-digit postal code, or null when it isn't a valid SG code. */
export function regionForPostalCode(postalCode) {
  const match = resolveSector(postalCode);
  return match ? match.region : null;
}

/** Region plus the human area name, for explaining a lookup back to the user. */
export function resolveSector(postalCode) {
  if (typeof postalCode !== 'string' || !/^\d{6}$/.test(postalCode)) return null;
  const sector = Number(postalCode.slice(0, 2));
  // Sector 00 and 74 are not issued; anything above 82 is out of range.
  const entry = SECTOR_REGIONS.find((r) => sector >= r.from && sector <= r.to);
  return entry ? { sector, region: entry.region, area: entry.area } : null;
}

// ---------------------------------------------------------------------------
// Settings shape
// ---------------------------------------------------------------------------

/** Typical door-to-door time when a merchant hasn't set one. */
export const DEFAULT_ETA_MINUTES = 45;

export const MIN_ETA_MINUTES = 5;
export const MAX_ETA_MINUTES = 480;

export const DEFAULT_DELIVERY = {
  enabled: false,
  mode: 'fixed', // 'fixed' | 'zone' — this is about the FEE only
  fixedFee: 0,
  zoneFees: { north: 0, south: 0, east: 0, west: 0 },
  /*
    Estimated door-to-door time, always per region — even on a flat fee.
    Charging one price island-wide doesn't make the drive to Tuas as quick
    as the one down the street, and the customer is quoted the time, not
    the merchant's pricing model.
  */
  zoneEtaMinutes: {
    north: DEFAULT_ETA_MINUTES,
    south: DEFAULT_ETA_MINUTES,
    east: DEFAULT_ETA_MINUTES,
    west: DEFAULT_ETA_MINUTES,
  },
  // A merchant may simply not deliver to part of the island. That is different
  // from delivering there for free, which is what a 0 fee means — so coverage
  // gets its own flag rather than being encoded as a magic price.
  zoneEnabled: { north: true, south: true, east: true, west: true },
};

/**
 * Whole minutes. Missing or nonsensical input falls back to the default, but
 * an out-of-band number is passed through untouched so validateDelivery can
 * reject it — silently clamping 900 to 480 would save a waiting time the
 * merchant never agreed to, and would make the validation unreachable.
 */
function toMinutes(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_ETA_MINUTES;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ETA_MINUTES;
  return n;
}

/** Money is stored as a number of dollars rounded to cents. */
function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Coerces whatever is stored or posted into the canonical shape. Used on both
 * sides so a partially-written record from an older version still loads.
 */
export function normalizeDelivery(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const zones = d.zoneFees && typeof d.zoneFees === 'object' ? d.zoneFees : {};
  const covered = d.zoneEnabled && typeof d.zoneEnabled === 'object' ? d.zoneEnabled : null;
  const etas = d.zoneEtaMinutes && typeof d.zoneEtaMinutes === 'object' ? d.zoneEtaMinutes : {};

  return {
    enabled: Boolean(d.enabled),
    mode: d.mode === 'zone' ? 'zone' : 'fixed',
    fixedFee: toMoney(d.fixedFee),
    zoneFees: DELIVERY_REGIONS.reduce((acc, r) => {
      acc[r] = toMoney(zones[r]);
      return acc;
    }, {}),
    // Records written before coverage existed have no zoneEnabled key. Those
    // shops were delivering everywhere, so absence must read as "all on" —
    // defaulting to false would silently stop their deliveries.
    zoneEnabled: DELIVERY_REGIONS.reduce((acc, r) => {
      acc[r] = covered ? Boolean(covered[r]) : true;
      return acc;
    }, {}),
    // Absent on records written before ETAs existed — those fall back to the
    // 45-minute default rather than to zero.
    zoneEtaMinutes: DELIVERY_REGIONS.reduce((acc, r) => {
      acc[r] = toMinutes(etas[r]);
      return acc;
    }, {}),
  };
}

const MAX_FEE = 200;

/**
 * Returns an array of human-readable problems. Empty means valid.
 *
 * Only validates hard once delivery is switched on — a merchant part-way
 * through filling the form shouldn't be blocked from saving the rest of their
 * ordering settings.
 */
export function validateDelivery(raw) {
  const d = normalizeDelivery(raw);
  const errors = [];

  if (!d.enabled) return errors;

  if (!['fixed', 'zone'].includes(d.mode)) {
    errors.push('Delivery mode must be "fixed" or "zone".');
  }

  for (const region of DELIVERY_REGIONS) {
    if (!d.zoneEnabled[region]) continue;
    const eta = d.zoneEtaMinutes[region];
    if (eta < MIN_ETA_MINUTES || eta > MAX_ETA_MINUTES) {
      errors.push(
        `${REGION_LABELS[region]} waiting time must be between ${MIN_ETA_MINUTES} and ${MAX_ETA_MINUTES} minutes.`
      );
    }
  }

  if (d.mode === 'fixed') {
    if (d.fixedFee > MAX_FEE) {
      errors.push(`Fixed delivery fee must be S$${MAX_FEE} or less.`);
    }
  } else {
    for (const region of DELIVERY_REGIONS) {
      if (d.zoneEnabled[region] && d.zoneFees[region] > MAX_FEE) {
        errors.push(`${REGION_LABELS[region]} delivery fee must be S$${MAX_FEE} or less.`);
      }
    }
  }

  // Delivery switched on with nothing covered would show customers a
  // delivery option that can never produce a quote — true of a flat fee too.
  if (!DELIVERY_REGIONS.some((r) => d.zoneEnabled[r])) {
    errors.push('Turn on at least one region, or switch delivery off.');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Quoting
// ---------------------------------------------------------------------------

/**
 * Prices a delivery to `input` (a postal code or an address containing one).
 *
 * Always returns a result object rather than throwing, because every failure
 * here is something the user needs explained: an unparseable address, a code
 * outside Singapore, or a region the merchant hasn't priced.
 *
 * @param {object} delivery   the merchant's delivery settings
 * @param {string} input      postal code or address
 */
export function quoteDelivery(delivery, input) {
  const d = normalizeDelivery(delivery);

  if (!d.enabled) {
    return { ok: false, code: 'DISABLED', message: 'Delivery is turned off for this shop.' };
  }

  const postalCode = extractPostalCode(input);
  if (!postalCode) {
    return {
      ok: false,
      code: 'NO_POSTAL_CODE',
      message:
        'Enter a 6-digit Singapore postal code, or an address that includes one.',
    };
  }

  const sector = resolveSector(postalCode);
  if (!sector) {
    return {
      ok: false,
      code: 'UNKNOWN_POSTAL_CODE',
      postalCode,
      message: `${postalCode} isn't a Singapore postal code we recognise.`,
    };
  }

  if (!d.zoneEnabled[sector.region]) {
    return {
      ok: false,
      code: 'REGION_NOT_SERVED',
      postalCode,
      region: sector.region,
      regionLabel: REGION_LABELS[sector.region],
      area: sector.area,
      message: `You don't deliver to the ${REGION_LABELS[sector.region]} region.`,
    };
  }

  return {
    ok: true,
    mode: d.mode,
    region: sector.region,
    regionLabel: REGION_LABELS[sector.region],
    area: sector.area,
    postalCode,
    // The fee follows the merchant's pricing mode; the time never does.
    fee: d.mode === 'fixed' ? d.fixedFee : d.zoneFees[sector.region],
    etaMinutes: d.zoneEtaMinutes[sector.region],
  };
}

/** "45 min" / "1 hr 15 min" — how the wait is shown to customers. */
export function formatEta(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  const hourPart = `${hours} hr`;
  return rest ? `${hourPart} ${rest} min` : hourPart;
}

/** Formats a fee the way it is shown to customers. */
export function formatFee(fee) {
  if (fee === 0) return 'Free';
  return `S$${Number(fee).toFixed(2)}`;
}
