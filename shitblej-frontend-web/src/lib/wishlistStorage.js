// Where the wishlist lives on this device.
//
// There used to be ONE key, "wishlist", doing two incompatible jobs: the guest
// store AND a cache of the signed-in user's server list. Every problem the
// wishlist had came from that overlap:
//
//   * The merge treated the key as "saves the server has not seen yet". After
//     a signed-in session it actually held that user's server list, so
//     anything they removed on another device was re-added on the next load.
//
//   * "Remember me" is unchecked by default, so the token lives in
//     sessionStorage and dies with the tab - but the cache is in localStorage
//     and does not. The next person to open that browser booted as a guest
//     holding the previous user's wishlist, and signing in merged it into
//     their account.
//
// So there are two kinds of key now, and the split is the fix:
//
//   wishlist:guest      only ever written while signed OUT, so it can only
//                       contain genuine pending guest saves
//   wishlist:user:<id>  a per-user render cache, namespaced by user id so one
//                       account can never read another's
//
// Every read and write is wrapped: storage throws outright in browsers set to
// block site data, and a wishlist is not worth a blank page.

const GUEST_KEY = "wishlist:guest";
const USER_PREFIX = "wishlist:user:";
const LEGACY_KEY = "wishlist";

export const guestKey = () => GUEST_KEY;
export const userKey = (userId) => `${USER_PREFIX}${userId}`;

/** The key holding the list to show for this identity. */
export const keyFor = (userId) => (userId ? userKey(userId) : GUEST_KEY);

function parse(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // The original format was id-only: ["abc", "def"].
    if (typeof parsed[0] === "string") return parsed.map((_id) => ({ _id }));
    return parsed.filter((p) => p && p._id);
  } catch {
    return [];
  }
}

/** Read a list of product snapshots from a key. Never throws. */
export function readList(key) {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return [];
  }
}

/** Write a list of product snapshots to a key. Never throws. */
export function writeList(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota, private mode, or site data blocked - nothing we can do */
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Move a pre-split "wishlist" key to whichever key it actually belonged to.
 *
 * Called once at startup with the identity the app booted as, because that is
 * the only thing that distinguishes the two cases:
 *
 *   booted signed in  ->  it was that user's cache
 *   booted as a guest ->  it was a guest's pending saves
 *
 * Getting this wrong in the guest direction is the leak described above, so it
 * is decided by the session rather than guessed. Only moves when the
 * destination is empty, so it can never overwrite newer data, and is a no-op
 * once the legacy key is gone.
 */
export function migrateLegacyKey(userId) {
  let legacy;
  try {
    legacy = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (legacy === null) return;

  const items = parse(legacy);
  const destination = keyFor(userId);
  if (items.length && readList(destination).length === 0) {
    writeList(destination, items);
  }
  removeKey(LEGACY_KEY);
}

/** Merge two lists of product snapshots, deduplicated by product id. */
export function mergeById(primary, secondary) {
  const seen = new Set();
  const out = [];
  for (const item of [...primary, ...secondary]) {
    if (!item?._id || seen.has(item._id)) continue;
    seen.add(item._id);
    out.push(item);
  }
  return out;
}
