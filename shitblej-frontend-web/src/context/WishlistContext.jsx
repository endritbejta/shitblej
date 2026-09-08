import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getSavedItems,
  addSavedItem,
  removeSavedItemByProduct,
} from "../api/savedItems";
import {
  guestKey,
  keyFor,
  mergeById,
  migrateLegacyKey,
  readList,
  removeKey,
  writeList,
} from "../lib/wishlistStorage";

const WishlistContext = createContext(null);

/** Keep just what a product card needs to render on the wishlist page. */
function toSnapshot(product) {
  return {
    _id: product._id,
    name: product.name,
    price: product.price,
    images: product.images?.length ? [product.images[0]] : undefined,
    image: product.image,
    condition: product.condition,
    category: product.category,
    location: product.location,
    description: product.description,
  };
}

const asProduct = (product) =>
  typeof product === "string" ? { _id: product } : product;

/**
 * A failed add that will never succeed, so retrying it forever is pointless.
 *
 * 404 - the product was deleted while it sat in the guest store.
 * 400 - "already in your saved items", i.e. it is on the account after all.
 *
 * Anything else (offline, 5xx, a 401 that ends the session) is transient, so
 * the item is kept for the next attempt.
 */
function isSettledForever(error) {
  const status = error?.response?.status;
  return status === 404 || status === 400;
}

/**
 * Hybrid wishlist store, and the single source of truth for every wishlist
 * surface (cards, PDP, search, the wishlist page, the header count).
 *
 * GUEST          localStorage under `wishlist:guest`. Instant, no account, no
 *                API calls - a guest has nothing to authenticate with.
 *
 * AUTHENTICATED  the server is the source of truth. `wishlist:user:<id>`
 *                caches it so a reload paints the real list instead of
 *                flashing empty, and is namespaced per user so one account
 *                can never read another's.
 *
 * TRANSITIONS    driven by the user's ID, not the user object:
 *
 *                  guest -> user     merge the guest store into the account
 *                  userA -> userB    load B's list; A's cache is never touched
 *                  user  -> guest    drop the list from memory
 *
 * The merge only ever reads `wishlist:guest`, which is only ever written while
 * signed out. That invariant is what stops a previous session's list being
 * merged into the next person's account, and stops an item removed on another
 * device being resurrected from a stale cache.
 */
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  // The ID, not the object. AuthContext hands out a fresh user object after it
  // revalidates the session, and keying on the object meant the same person
  // triggered a second, overlapping sync.
  const userId = user?._id ?? null;

  // Whatever this identity has on this device, so the first paint is right.
  const [items, setItems] = useState(() => {
    const bootUserId = readBootUserId();
    migrateLegacyKey(bootUserId);
    return readList(keyFor(bootUserId));
  });
  const [loading, setLoading] = useState(false);

  // The current list, updated synchronously. Two hearts clicked in the same
  // tick both need to see the result of the first, and React state does not
  // update until the next render - reading the rendered `items` there made the
  // second click overwrite the first instead of adding to it.
  const itemsRef = useRef(items);

  // The identity the current `items` belong to, so a stale async result can be
  // recognised and dropped.
  const syncedFor = useRef(undefined); // undefined = nothing synced yet
  const runId = useRef(0);

  /**
   * Apply a new list: ref, React state and this identity's stored copy, in one
   * place so they cannot disagree. `update` may be a list or a function of the
   * current list.
   */
  const commit = useCallback((update, forUserId, { persist = true } = {}) => {
    const next =
      typeof update === "function" ? update(itemsRef.current) : update;
    itemsRef.current = next;
    setItems(next);
    if (persist) writeList(keyFor(forUserId), next);
    return next;
  }, []);

  // ── Auth transitions ────────────────────────────────────────────────────
  useEffect(() => {
    // Same person as the last run: nothing to do. This is the guard that stops
    // a re-render (or a revalidated user object) starting a second sync.
    if (syncedFor.current === userId) return;

    const previous = syncedFor.current;
    syncedFor.current = userId;
    const run = ++runId.current;
    const isStale = () => run !== runId.current;

    if (!userId) {
      // Signed out. Drop the list from memory so the next visitor on this
      // browser cannot see it. The ex-user's cache is left alone under their
      // own key - it is theirs, and it is re-validated against the server the
      // next time they sign in.
      //
      // `previous === undefined` means we booted as a guest, in which case the
      // guest store is already what state holds and must not be wiped.
      // Not persisted: writing [] would erase a guest store still holding
      // saves that a failed merge left pending.
      if (previous) commit([], null, { persist: false });
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1. The account is the source of truth.
        const saved = await getSavedItems();
        const serverProducts = saved.map((s) => s.product).filter(Boolean);
        if (cancelled || isStale()) return;

        // 2. Genuine pending guest saves only. Switching directly from one
        //    account to another must not carry anything across, so this is
        //    skipped unless we came from a signed-out state.
        const cameFromGuest = !previous;
        const pending = cameFromGuest ? readList(guestKey()) : [];
        const serverIds = new Set(serverProducts.map((p) => p._id));
        const toAdd = pending.filter((p) => !serverIds.has(p._id));

        if (!toAdd.length) {
          commit(serverProducts, userId);
          // Everything the guest had is already on the account.
          if (cameFromGuest && pending.length) removeKey(guestKey());
          return;
        }

        // 3. Show the merge immediately - the user should not watch a spinner
        //    to find out their saves survived. The server list is authoritative
        //    for ordering, the guest's extras go on top.
        commit(mergeById(toAdd, serverProducts), userId);

        // 4. Persist, then find out what actually made it.
        const results = await Promise.allSettled(
          toAdd.map((p) => addSavedItem(p._id))
        );
        if (cancelled || isStale()) return;

        const unsynced = toAdd.filter(
          (_, i) =>
            results[i].status === "rejected" &&
            !isSettledForever(results[i].reason)
        );

        // 5. Re-read the account so state matches what was really stored.
        let merged;
        try {
          const after = await getSavedItems();
          merged = after.map((s) => s.product).filter(Boolean);
        } catch {
          // The writes may well have landed; we just cannot confirm the list.
          // Keep the optimistic merge rather than throwing the UI back.
          merged = mergeById(toAdd, serverProducts);
        }
        if (cancelled || isStale()) return;

        commit(merged, userId);

        // 6. Clear the guest store LAST, and only of what is now safely on the
        //    account. Anything that failed transiently stays for the next
        //    sign-in, so a failed merge never destroys a guest's saves.
        if (unsynced.length) {
          writeList(guestKey(), unsynced);
        } else {
          removeKey(guestKey());
        }
      } catch {
        // Could not reach the account at all. Keep showing what we have - for
        // a just-signed-in guest that is their guest list, which is still
        // safely in `wishlist:guest` and will be merged on the next attempt.
        // Allow that retry by forgetting that this identity was synced.
        if (!cancelled && !isStale()) syncedFor.current = previous;
      } finally {
        if (!cancelled && !isStale()) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, commit]);

  // ── Cross-tab sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const key = keyFor(userId);
    const onStorage = (e) => {
      // Another tab changed this identity's list; adopt it without writing
      // back, or the two tabs would ping-pong.
      if (e.key === key) commit(readList(key), userId, { persist: false });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, commit]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const toggle = useCallback(
    (product) => {
      const item = asProduct(product);
      const id = item?._id;
      if (!id) return;

      // The ref, not the rendered `items`: see itemsRef above.
      const wasSaved = itemsRef.current.some((p) => p._id === id);

      // Optimistic: the heart flips instantly on every surface at once.
      commit(
        (prev) =>
          wasSaved
            ? prev.filter((p) => p._id !== id)
            : [toSnapshot(item), ...prev],
        userId
      );

      if (!userId) return; // guest: local only, no request to make

      const request = wasSaved
        ? removeSavedItemByProduct(id)
        : addSavedItem(id);

      request.catch((error) => {
        // A duplicate add or a missing item means the server already agrees
        // with what we just rendered; only a real failure needs reverting.
        if (isSettledForever(error)) return;
        commit(
          (prev) =>
            wasSaved
              ? prev.some((p) => p._id === id)
                ? prev
                : [toSnapshot(item), ...prev]
              : prev.filter((p) => p._id !== id),
          userId
        );
      });
    },
    [userId, commit]
  );

  const remove = useCallback(
    (id) => {
      if (!id) return;
      const removed = itemsRef.current.find((p) => p._id === id);
      if (!removed) return;

      commit((prev) => prev.filter((p) => p._id !== id), userId);

      if (!userId) return;

      removeSavedItemByProduct(id).catch((error) => {
        if (isSettledForever(error)) return;
        commit(
          (prev) => (prev.some((p) => p._id === id) ? prev : [removed, ...prev]),
          userId
        );
      });
    },
    [userId, commit]
  );

  const clear = useCallback(() => {
    const snapshot = itemsRef.current;
    commit([], userId);
    if (userId && snapshot.length) {
      Promise.allSettled(snapshot.map((p) => removeSavedItemByProduct(p._id)));
    }
  }, [userId, commit]);

  const isSaved = useCallback((id) => items.some((p) => p._id === id), [items]);

  const value = useMemo(
    () => ({ items, count: items.length, loading, toggle, remove, clear, isSaved }),
    [items, loading, toggle, remove, clear, isSaved]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

/**
 * Which identity this page load starts as, read straight from storage.
 *
 * Needed because the very first render has to pick a storage key before any
 * effect has run, and AuthContext hydrates its user from the same place. Kept
 * here rather than imported from authToken so this module owns one concern:
 * deciding which wishlist belongs to this device right now.
 */
function readBootUserId() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?._id ?? null;
  } catch {
    return null;
  }
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
