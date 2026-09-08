import { buildSrcSet, imageAtWidth, WIDTHS } from "./imageUrl";

// The homepage hero background, in one place.
//
// It lives in its own module because TWO places need it and they must agree
// exactly: the <img> in components/home/Hero.jsx, and the <link rel="preload">
// that vite.config.js injects into index.html at build time.
//
// Why the preload matters more than anything else on this page: this is a
// client-rendered SPA, so index.html contains an empty #root and no image
// reference at all. The hero could therefore only be discovered after the
// entry bundle downloaded, React mounted, and the route chunk arrived - it was
// measured being requested 2.6 SECONDS into the load on the deployed site,
// which is almost the whole of its LCP. The preload puts it in the initial
// document, so the preload scanner starts it in the first few milliseconds
// alongside the JavaScript instead of after it.
//
// Why they must agree exactly: the preload and the <img> have to resolve to
// the same candidate, or the browser downloads the image twice. `imagesrcset`
// and `imagesizes` on the link mirror `srcset` and `sizes` on the img, and
// both are generated from the constants below so they cannot drift.

const URL = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop";

// The image is 3:2 (measured: 1280x854 at w=1280). Declared on the <img> so it
// has an intrinsic ratio; the layout size comes from CSS (absolute inset-0,
// h-full w-full, object-cover), so these do not affect the box.
const ASPECT = 1280 / 854;

/**
 * Full-bleed, so the slot is always the viewport width. The browser multiplies
 * this by its own devicePixelRatio when choosing from `srcset`, which is what
 * makes the ladder DPR-aware: a 360px phone at 3x asks for ~1080 and gets the
 * 1280 candidate (~104 KiB) rather than the 2070 original (~228 KiB).
 */
export const HERO_SIZES = "100vw";

/** Candidate widths. Unsplash resizes on delivery and negotiates AVIF/WebP. */
export const HERO_SRCSET = buildSrcSet(URL, WIDTHS.hero);

/**
 * Fallback for browsers that ignore srcset. Deliberately mid-ladder rather
 * than the largest: this is a decorative background at 40% opacity behind two
 * gradient scrims, so it is never examined closely.
 */
export const HERO_SRC = imageAtWidth(URL, 1280);

export const HERO_WIDTH = 1600;
export const HERO_HEIGHT = Math.round(HERO_WIDTH / ASPECT);
