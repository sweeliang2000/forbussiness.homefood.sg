import 'server-only';

import {
  APP_AWS_REGION,
  SHOP_IMAGES_BUCKET,
  REWARD_IMAGES_BUCKET,
  MENU_BUCKET,
  CLOUDFRONT_DOMAIN,
} from './env';

/**
 * Canonical S3 key construction.
 *
 * These formats are transcribed from the original write sites and MUST NOT
 * drift: keys are stored inside URLs in DynamoDB and Supabase, so a changed
 * format silently orphans every existing image.
 *
 *   shop images     `${shop_id}_banner`                     Authentication.js:1064, 2919
 *                   `${shop_id}_thumbnail`
 *                   `${shop_id}_defaultStampedIcon`         Authentication.js:2269, 2532
 *                   `${shop_id}_defaultUnStampedIcon`
 *                   `${shop_id}_qr_card_image`              Authentication.js:1504, 1743
 *                   `${shop_id}/stampedIcon_${index}`       Authentication.js:2361
 *   reward images   `${shop_id}/${reward_id}.${ext}`        Authentication.js:5815, 6207
 *   menu photos     `menus/${shop_id}/items/${item_id}/${filename}`   Authentication.js:8040, 8056
 */

export const BUCKETS = {
  SHOP_IMAGES: SHOP_IMAGES_BUCKET,
  REWARD_IMAGES: REWARD_IMAGES_BUCKET,
  MENU: MENU_BUCKET,
};

// --- key builders -----------------------------------------------------------

/** `banner` | `thumbnail` | `defaultStampedIcon` | `defaultUnStampedIcon` */
export const shopImageKey = (shopId, field) => `${shopId}_${field}`;

export const qrCardImageKey = (shopId) => `${shopId}_qr_card_image`;

/** `fileName` is `stampedIcon` or `unstampedIcon`. */
export const individualStampKey = (shopId, fileName, index) =>
  `${shopId}/${fileName}_${index}`;

export const rewardImageKey = (shopId, rewardId, ext) =>
  `${shopId}/${rewardId}.${ext}`;

export const menuItemPhotoKey = (shopId, itemId, filename) =>
  `menus/${shopId}/items/${itemId}/${filename}`;

export const menuItemPhotoPrefix = (shopId, itemId) =>
  `menus/${shopId}/items/${itemId}/`;

// --- URL builders -----------------------------------------------------------

const encodeKey = (key) => String(key).split('/').map(encodeURIComponent).join('/');

/**
 * Public virtual-hosted S3 URL.
 *
 * Replaces nine hand-rolled template literals that interpolated
 * `process.env.AWS_REGION` — a name we can no longer read on Vercel. Every key
 * this is called with is server-constructed from a UUID plus a literal suffix,
 * so the percent-encoding is a no-op today; it's here so a future key
 * containing a space or `#` doesn't produce a quietly broken URL.
 */
export const s3PublicUrl = (bucket, key) =>
  `https://${bucket}.s3.${APP_AWS_REGION}.amazonaws.com/${encodeKey(key)}`;

/** Published images are served through CloudFront, not S3 directly. */
export const cloudfrontUrl = (key) => `https://${CLOUDFRONT_DOMAIN}/${encodeKey(key)}`;

/**
 * Parse a bucket/key back out of an S3 URL. Handles both virtual-hosted
 * (`https://bucket.s3.region.amazonaws.com/key`) and path-style
 * (`https://s3.region.amazonaws.com/bucket/key`) forms, because stored URLs
 * predate any single convention.
 */
export function parseS3Url(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const path = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

    const virtualHosted = host.match(/^(.+?)\.s3[.-]/);
    if (virtualHosted) {
      return { bucket: virtualHosted[1], key: path };
    }

    // Path-style: first segment is the bucket.
    const slash = path.indexOf('/');
    if (slash > 0) {
      return { bucket: path.slice(0, slash), key: path.slice(slash + 1) };
    }

    return null;
  } catch {
    return null;
  }
}

// --- presigned upload registry ---------------------------------------------

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * What a browser is allowed to request a presigned PUT for.
 *
 * `shopId` is always supplied by the server from the session, never by the
 * client — otherwise any authenticated merchant could mint a URL writing into
 * another shop's prefix. Everything else the client supplies is validated
 * against SAFE_SEGMENT to keep `../` out of the key.
 */
export const UPLOAD_PURPOSES = {
  shop_banner: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId }) => shopImageKey(shopId, 'banner'),
  },
  shop_thumbnail: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId }) => shopImageKey(shopId, 'thumbnail'),
  },
  stamp_icon_default: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId }) => shopImageKey(shopId, 'defaultStampedIcon'),
  },
  stamp_icon_default_unstamped: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId }) => shopImageKey(shopId, 'defaultUnStampedIcon'),
  },
  qr_card_image: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId }) => qrCardImageKey(shopId),
  },
  individual_stamp_stamped: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId, index }) => individualStampKey(shopId, 'stampedIcon', requireIndex(index)),
  },
  individual_stamp_unstamped: {
    bucket: () => BUCKETS.SHOP_IMAGES,
    key: ({ shopId, index }) => individualStampKey(shopId, 'unstampedIcon', requireIndex(index)),
  },
  reward_image: {
    bucket: () => BUCKETS.REWARD_IMAGES,
    key: ({ shopId, rewardId, filename }) =>
      rewardImageKey(shopId, requireSegment(rewardId, 'rewardId'), extensionOf(filename)),
  },
  menu_item_photo: {
    bucket: () => BUCKETS.MENU,
    key: ({ shopId, itemId, filename }) =>
      menuItemPhotoKey(
        shopId,
        requireSegment(itemId, 'itemId'),
        requireSegment(filename, 'filename')
      ),
  },
};

function requireSegment(value, name) {
  if (!value || !SAFE_SEGMENT.test(String(value))) {
    throw new Error(`Invalid ${name}`);
  }
  return String(value);
}

function requireIndex(index) {
  const n = Number(index);
  if (!Number.isInteger(n) || n < 0 || n > 999) {
    throw new Error('Invalid index');
  }
  return n;
}

function extensionOf(filename) {
  const ext = String(filename || '').split('.').pop();
  if (!ext || !SAFE_SEGMENT.test(ext)) throw new Error('Invalid filename');
  return ext;
}

/**
 * Confirm a client-supplied key is one this shop is allowed to have written.
 *
 * Most purposes produce a fully server-derivable key, so the check is strict
 * equality. Menu photos embed a client-chosen filename, so they're checked by
 * prefix instead.
 */
export function assertOwnedKey(key, purpose, params) {
  const spec = UPLOAD_PURPOSES[purpose];
  if (!spec) throw new Error(`Unknown upload purpose: ${purpose}`);

  if (purpose === 'menu_item_photo') {
    const prefix = menuItemPhotoPrefix(params.shopId, requireSegment(params.itemId, 'itemId'));
    if (!String(key).startsWith(prefix)) {
      throw new Error('Key does not belong to this shop');
    }
    return key;
  }

  const expected = spec.key(params);
  if (key !== expected) {
    throw new Error('Key does not belong to this shop');
  }
  return key;
}
