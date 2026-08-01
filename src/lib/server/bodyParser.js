import 'server-only';

/**
 * Request body parsing, producing exactly the shapes the ported controllers
 * expect from body-parser and multer.
 *
 * Modes:
 *   'json'  JSON body (also handles urlencoded, which a couple of forms post)
 *   'form'  multipart/form-data -> multer-shaped req.files / req.file
 *   'raw'   untouched Buffer, for Stripe webhook signature verification
 *   'none'  skip entirely
 *
 * 'json' is tolerant of an absent or empty body because several DELETE routes
 * send none, while three others (qrCode, invitedUser, userFromShop) DO send a
 * JSON body on DELETE via axios `{ data: ... }`.
 */

/** multer's memoryStorage file shape, which 48 controller call sites read. */
async function toMulterFile(fieldname, file) {
  return {
    fieldname,
    originalname: file.name,
    encoding: '7bit',
    mimetype: file.type || 'application/octet-stream',
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

function isFileLike(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function';
}

async function parseJson(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    if (!text) return {};
    return Object.fromEntries(new URLSearchParams(text));
  }

  const text = await request.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    // Match body-parser: a malformed body becomes an empty one rather than a
    // 500, and the handler's own validation produces the 400.
    return {};
  }
}

/**
 * multipart -> { body, files, file }
 *
 * `files` is keyed by field name with array values, matching multer's
 * .fields()/.any() output; `file` is the single-file .single() shape. Both are
 * populated so a handler written against either keeps working.
 *
 * Note POST /api/menu used multer's .any() with dynamic field names
 * (`item_photo_<itemId>`), which is why this iterates rather than matching a
 * known field list.
 */
async function parseForm(request) {
  const formData = await request.formData();

  const body = {};
  const files = {};
  let file = null;

  for (const [key, value] of formData.entries()) {
    if (isFileLike(value)) {
      const multerFile = await toMulterFile(key, value);
      (files[key] ??= []).push(multerFile);
      file ??= multerFile;
    } else {
      body[key] = value;
    }
  }

  return { body, files, file };
}

export async function parseBody(request, mode = 'json') {
  const empty = { body: null, files: null, file: null };

  if (mode === 'none' || request.method === 'GET' || request.method === 'HEAD') {
    return { ...empty, body: {} };
  }

  if (mode === 'raw') {
    // arrayBuffer(), not text(): Stripe verifies a signature over the exact
    // bytes, so no encoding round-trip may happen anywhere in this path.
    return { ...empty, body: Buffer.from(await request.arrayBuffer()) };
  }

  if (mode === 'form') {
    return parseForm(request);
  }

  return { ...empty, body: await parseJson(request) };
}
