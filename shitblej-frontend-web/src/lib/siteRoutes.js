// The routes worth telling a crawler about, in one place.
//
// Deliberately plain data with no imports. vite-plugins.js reads this at build
// time to emit sitemap.xml, and importing constants/index.js there instead
// would drag lucide-react into the Vite config just to read some slugs.
//
// The category list is duplicated from CATEGORIES rather than derived, which
// siteRoutes.test.js guards: it asserts every category has a collection entry
// here, so adding a category to constants/index.js and forgetting the sitemap
// fails CI rather than silently shipping an incomplete sitemap.

/** Category slugs, matching CATEGORIES in constants/index.js. */
const CATEGORY_SLUGS = [
  "ladies",
  "men",
  "designer-items",
  "children",
  "home",
  "electronics",
  "entertainment",
  "hobby-collector",
  "sport",
];

/**
 * Paths a crawler should index, with a rough priority.
 *
 * Product pages are absent on purpose: they only exist per listing, so
 * enumerating them would mean querying the API during the build. That would
 * couple `npm run build` to a live backend, which vite.config.js deliberately
 * avoids - the build refuses to run without VITE_API_URL precisely so it never
 * depends on the API being reachable. Listings are reachable by crawling the
 * collection pages instead.
 */
export const CRAWLABLE_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  ...CATEGORY_SLUGS.map((slug) => ({
    path: `/collections/${slug}`,
    priority: "0.8",
    changefreq: "daily",
  })),
  { path: "/login", priority: "0.3", changefreq: "yearly" },
  { path: "/signup", priority: "0.3", changefreq: "yearly" },
];

/**
 * Paths robots.txt tells crawlers to skip.
 *
 * /sell, /inbox and /profile sit behind ProtectedRoute, so a crawler is
 * redirected to /login and would index a sign-in page under three different
 * URLs. /wishlist is public but personal - for a crawler it is always empty.
 *
 * Exported for the test that keeps public/robots.txt honest about them.
 */
export const DISALLOWED_ROUTES = ["/sell", "/inbox", "/profile", "/wishlist"];

export { CATEGORY_SLUGS };
