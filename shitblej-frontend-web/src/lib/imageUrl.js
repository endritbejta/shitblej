// Ask the image host for the size we actually display.
//
// The problem this solves: nothing on the frontend knew anything about the
// image hosts, so every image was requested at whatever size happened to be
// stored. A product card whose box is ~250x312 CSS px was downloading the full
// 1200px asset the backend stores, and the hero was downloading 2070px for a
// slot no wider than the viewport. Lighthouse measured 1,056 KiB of that as
// pure waste.
//
// Both hosts can resize on delivery, so the fix is a URL, not a new pipeline:
//
//   Cloudinary  transformation segment after /upload/
//   Unsplash    ?w= on the imgix-backed CDN
//
// Anything else - a local /uploads/ path from UPLOAD_DRIVER=local, a data URI,
// a placeholder, an absolute URL from somewhere new - is returned untouched.
// This helper must never be the reason an image stops loading.
//
// ON DPR: there is no `dpr_auto` here on purpose. Cloudinary's dpr_auto needs
// client hints to be enabled to do anything, and silently returns 1x when they
// are not. `srcset` with `w` descriptors plus `sizes` is the mechanism that
// actually works everywhere, and it is DPR-aware by definition: the browser
// multiplies the `sizes` slot width by its own devicePixelRatio before picking
// a candidate. So a 250px slot on a 3x phone correctly asks for ~750px.

const CLOUDINARY = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/;
const UNSPLASH = /^https?:\/\/images\.unsplash\.com\//;

// A Cloudinary path segment that is a transformation rather than a version or
// a public id: comma-separated `k_v` pairs.
const TRANSFORM_SEGMENT = /^[a-z]{1,3}_[^/]*(,[a-z]{1,3}_[^/]*)*$/;

/**
 * Cloudinary delivery URL for a given width.
 *
 * `c_limit` never enlarges: asking for 800px from a 600px master returns
 * 600px rather than an upscaled blur. f_auto/q_auto are already applied as an
 * incoming transformation at upload time (see backend/src/config/upload.js),
 * but repeating them here is free and keeps the URL correct for any asset that
 * was stored before that was true.
 */
function cloudinaryAtWidth(url, width) {
  const match = url.match(CLOUDINARY);
  if (!match) return null;

  const [, base, rest] = match;
  const firstSegment = rest.split("/")[0] || "";

  // Respect a width someone has already asked for explicitly - overriding it
  // would silently change what a caller chose.
  if (TRANSFORM_SEGMENT.test(firstSegment) && /(^|,)w_/.test(firstSegment)) {
    return url;
  }

  return `${base}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/** Unsplash delivery URL for a given width, preserving the other params. */
function unsplashAtWidth(url, width) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("w", String(width));
    // Unsplash negotiates WebP/AVIF from the Accept header when asked.
    if (!parsed.searchParams.has("auto")) parsed.searchParams.set("auto", "format");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * The same image at a specific width, or the URL unchanged when the host is
 * not one we can resize.
 */
export function imageAtWidth(url, width) {
  if (typeof url !== "string" || !url) return url;
  if (CLOUDINARY.test(url)) return cloudinaryAtWidth(url, width) || url;
  if (UNSPLASH.test(url)) return unsplashAtWidth(url, width);
  return url;
}

/** True when this URL's host can resize on delivery. */
export function isResizable(url) {
  return typeof url === "string" && (CLOUDINARY.test(url) || UNSPLASH.test(url));
}

/**
 * A `srcset` for the given candidate widths, or null when the host cannot
 * resize - in which case the caller should omit the attribute entirely rather
 * than emit a srcset of identical URLs, which would let the browser pick a
 * "larger" candidate that is really the same bytes.
 */
export function buildSrcSet(url, widths) {
  if (!isResizable(url) || !widths?.length) return null;
  return [...new Set(widths)]
    .sort((a, b) => a - b)
    .map((w) => `${imageAtWidth(url, w)} ${w}w`)
    .join(", ");
}

// Candidate ladders. Kept here so every call site asks for the same widths and
// the CDN caches are shared rather than fragmented across near-identical sizes.
export const WIDTHS = {
  // Small fixed thumbnails and avatars - 36-64 CSS px. These were the worst
  // offenders relative to their size: a 40px avatar was downloading the full
  // stored asset.
  thumb: [64, 96, 128, 192, 256],
  // Product cards in grids and rails: ~150-320 CSS px, so up to ~960 at 3x.
  card: [240, 320, 480, 640, 960],
  // Full-bleed decorative imagery. Capped at 1600 deliberately, not because
  // bigger screens do not exist: `sizes="100vw"` on a 1366px viewport at DPR 2
  // asks for 2732px, and offering a 2000w candidate meant a Retina desktop
  // downloaded 213 KiB - barely less than the 228 KiB single fixed size this
  // replaced. The hero is drawn at 40% opacity behind two gradient scrims, so
  // resampling 1600px up to a 2732px box is invisible, and it is the
  // difference between 145 KiB and 213 KiB on every Retina load.
  //
  // This is the ceiling on delivered quality for a background, and it is only
  // used for backgrounds - product imagery, which people actually examine,
  // uses `detail` and `card`.
  hero: [640, 960, 1280, 1600],
  // Editorial tiles, roughly half the container on desktop.
  tile: [320, 480, 640, 960, 1280],
  // The PDP gallery, which is close to full width on mobile and ~60% on desktop.
  detail: [480, 720, 960, 1280, 1600],
};
