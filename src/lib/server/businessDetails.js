import 'server-only';

import { createHash } from 'node:crypto';

/**
 * Official Business Details — the fields an admin has to sign off on.
 *
 * These are the shop's legal identity (registered name, UEN, registered
 * address), not anything customer-facing. They are the one thing a merchant
 * cannot change unilaterally after release: menu, customer-facing details, shop
 * settings and payment settings all publish straight to Supabase, these go back
 * to the admin console for review.
 *
 * IMPORTANT: this file is duplicated as
 * foradmin.homefood.sg/lib/server/businessDetails.js. The two must produce
 * identical hashes or a merchant edit will look like a change to one app and not
 * the other. Change both together.
 */

export const BUSINESS_DETAIL_FIELDS = [
  'businessName',
  'uen',
  'addressUnitNumber',
  'addressBuildingName',
  'addressStreetAddress',
  'addressPostalCode',
];

/** Unit separator — cannot appear in any of these values, so "ab"+"c" and "a"+"bc" can't collide. */
const SEPARATOR = '␟';

/**
 * Fingerprints the six fields.
 *
 * Values are trimmed and lowercased before hashing, so re-typing "Sunrise
 * Bakery " with a trailing space is not treated as a change worth an admin's
 * time. A missing field hashes the same as an empty one.
 */
export function fingerprintBusinessDetails(record) {
  const normalised = BUSINESS_DETAIL_FIELDS.map((field) =>
    String(record?.[field] ?? '').trim().toLowerCase()
  ).join(SEPARATOR);

  return createHash('sha256').update(normalised).digest('hex');
}

/**
 * The six fields as a plain object.
 *
 * The merchant app only needs the fingerprint; the snapshot is written by the
 * admin app when it approves a release, and read back here on the next edit to
 * decide whether anything actually changed. Kept in this shared file so both
 * copies stay identical.
 */
export function snapshotBusinessDetails(record) {
  const snapshot = {};
  for (const field of BUSINESS_DETAIL_FIELDS) {
    snapshot[field] = String(record?.[field] ?? '');
  }
  return snapshot;
}
