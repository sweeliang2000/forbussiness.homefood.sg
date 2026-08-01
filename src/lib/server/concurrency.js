import 'server-only';

/**
 * Map over `items` running at most `limit` tasks at once, preserving order.
 *
 * Exists because several ported handlers did their I/O in a plain `for` loop —
 * one S3 CopyObject per menu photo on publish, one Supabase update per order in
 * delay-all. That's fine when nothing is watching the clock and fatal under a
 * function timeout: 80 sequential round trips is a minute, the same 80 at
 * concurrency 8 is a couple of seconds.
 *
 * Errors propagate. Callers that want best-effort semantics (publish does)
 * should catch inside `fn` and return a sentinel, which is what the original
 * loops did anyway.
 */
export async function mapWithConcurrency(items, limit, fn) {
  const list = Array.from(items ?? []);
  const results = new Array(list.length);

  if (list.length === 0) return results;

  const width = Math.max(1, Math.min(limit, list.length));
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      const index = cursor++;
      results[index] = await fn(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: width }, worker));

  return results;
}
