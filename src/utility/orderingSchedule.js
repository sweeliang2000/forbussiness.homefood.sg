/**
 * Ordering-hours schedule maths.
 *
 * `hours` is the 7-element array the merchant edits in Shop Settings, indexed
 * Sun(0)..Sat(6), each { open: "HH:MM", close: "HH:MM", enabled: bool }.
 *
 * Hours no longer decide whether a shop is open — the merchant's switch does
 * that. What hours decide is *when to ask*: the POS watches for the moment a
 * window starts or ends and prompts the merchant to reconcile. So the job of
 * this module is to answer "when is the next boundary?", not "are we open?".
 *
 * Everything is evaluated in Singapore time regardless of where the code runs.
 * The merchant writes "17:00" meaning 5pm in their kitchen, and a POS on a
 * laptop set to another timezone — or a server running in UTC — has to reach
 * the same instant.
 */

// Singapore is UTC+8 year-round, no DST, so a fixed offset is exact.
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

const pad2 = (n) => String(n).padStart(2, '0');

// A Date shifted so its getUTC* accessors read as SGT wall-clock. Never format
// this with local accessors — it is a carrier for the wall clock, not an
// instant.
function sgtClock(at) {
  return new Date(at + SGT_OFFSET_MS);
}

export function hmToMinutes(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** SGT weekday (0=Sun) and minutes-since-midnight at `at`. */
export function sgtParts(at = Date.now()) {
  const d = sgtClock(at);
  return {
    weekday: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** SGT calendar date `dayOffset` days from `at`, as 'YYYY-MM-DD'. */
export function sgtDateStr(at = Date.now(), dayOffset = 0) {
  const d = sgtClock(at);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Epoch ms for an SGT wall date + "HH:MM". */
function instantAt(dateStr, hm) {
  const t = Date.parse(`${dateStr}T${hm}:00.000+08:00`);
  return Number.isNaN(t) ? null : t;
}

function dayWindow(hours, weekday) {
  const h = Array.isArray(hours) && hours.length >= 7 ? hours[weekday] : null;
  if (!h || !h.enabled) return null;
  const openMin = hmToMinutes(h.open);
  const closeMin = hmToMinutes(h.close);
  // open === close is a zero-length window, which the storefront already treats
  // as "no window" rather than "open all day".
  if (openMin === null || closeMin === null || openMin === closeMin) return null;
  return { openMin, closeMin, open: h.open, close: h.close };
}

/**
 * Is `at` inside the day's ordering window? Mirrors the storefront's
 * isOrderingOpenNow window logic, including windows that run past midnight.
 *
 * This is descriptive only — it says where we are in the schedule, not whether
 * customers can order.
 */
export function isWithinHours(hours, at = Date.now()) {
  if (!Array.isArray(hours) || hours.length < 7) return true; // no schedule → unrestricted
  const { weekday, minutes } = sgtParts(at);
  const today = dayWindow(hours, weekday);

  // An overnight window opened yesterday and is still running.
  const yesterday = dayWindow(hours, (weekday + 6) % 7);
  if (yesterday && yesterday.closeMin < yesterday.openMin && minutes < yesterday.closeMin) return true;

  if (!today) return false;
  if (today.closeMin > today.openMin) return minutes >= today.openMin && minutes < today.closeMin;
  return minutes >= today.openMin; // overnight: the tail is handled above
}

/**
 * The first schedule boundary strictly after `at`.
 *
 * Returns { at, type, hm, label } where type is 'open' or 'close', or null when
 * no window is configured in the next week (every day disabled, or no schedule
 * at all) — in which case there is nothing to prompt about.
 *
 * Days are scanned rather than reasoned about because an overnight window's
 * close can land after the following day's open, so the candidates don't come
 * out in order. Collect, then take the earliest.
 */
export function nextBoundary(hours, at = Date.now()) {
  if (!Array.isArray(hours) || hours.length < 7) return null;

  const { weekday } = sgtParts(at);
  const candidates = [];

  // 8 days so a window late on the same weekday next week is still found.
  for (let n = 0; n <= 8; n++) {
    const win = dayWindow(hours, (weekday + n) % 7);
    if (!win) continue;

    const dateStr = sgtDateStr(at, n);
    const openAt = instantAt(dateStr, win.open);
    // Overnight window — the close belongs to the following calendar day.
    const closeAt = win.closeMin > win.openMin
      ? instantAt(dateStr, win.close)
      : instantAt(sgtDateStr(at, n + 1), win.close);

    if (openAt !== null) candidates.push({ at: openAt, type: 'open', hm: win.open });
    if (closeAt !== null) candidates.push({ at: closeAt, type: 'close', hm: win.close });
  }

  const upcoming = candidates.filter((c) => c.at > at).sort((a, b) => a.at - b.at);
  return upcoming[0] ?? null;
}

/** "17:00" → "5:00 PM". */
export function format12h(hm) {
  const mins = hmToMinutes(hm);
  if (mins === null) return String(hm ?? '');
  const h = Math.floor(mins / 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${pad2(mins % 60)} ${suffix}`;
}
