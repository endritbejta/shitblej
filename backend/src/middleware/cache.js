// HTTP cache policy.
//
// The API sent no Cache-Control at all. Express adds an ETag to every JSON
// response, but a client only sends `If-None-Match` for a response it was
// allowed to store - so nothing revalidated, and every repeat read shipped a
// full payload.
//
// Two policies, and the default is the restrictive one. A new endpoint is
// private until someone deliberately says otherwise, rather than the reverse.

// Everything under the API prefix, unless a route overrides it.
//
// `no-store` rather than `private`: these responses are per-user and several
// carry another person's words (a chat thread) or a home address (an order).
// Nothing should hold them - not a shared proxy, not the browser's disk cache
// on a shared machine. Today the Authorization header keeps most intermediary
// caches off them anyway, but that is an implicit assumption, and this makes
// it a statement.
const noStore = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};

// Public reads: the product catalogue. No authentication, no per-user content.
//
// `max-age` is deliberately short. A price edit or a listing going `reserved`
// should surface quickly, and the numbers below are the staleness a browser
// may show before it asks again. Nothing enforcing money or availability
// depends on this: the offer and checkout paths re-read state server-side and
// refuse a stale action, so a briefly out-of-date badge is cosmetic.
//
// `stale-while-revalidate` is what makes repeat navigation feel instant - the
// cached copy renders immediately while the revalidation happens behind it -
// and the existing ETag turns that revalidation into a 304 with no body.
const publicRead = ({ maxAge = 30, staleWhileRevalidate = 300 } = {}) => (
  req,
  res,
  next
) => {
  res.set(
    "Cache-Control",
    `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  next();
};

module.exports = { noStore, publicRead };
