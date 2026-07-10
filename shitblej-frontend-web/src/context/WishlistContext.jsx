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

const WishlistContext = createContext(null);
const STORAGE_KEY = "wishlist";

function readInitial() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Migrate the old id-only format ["id", ...] → snapshot objects.
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed.map((_id) => ({ _id }));
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

/**
 * Hybrid wishlist store.
 *
 * - Guests: backed by localStorage (instant, no account needed).
 * - Authenticated users: the server (`/saved-items`) is the source of truth,
 *   with localStorage acting as an offline cache so there's no empty flash on
 *   load. Toggles are optimistic and revert on failure.
 * - On login, the guest's local saves are merged into the server once, then the
 *   merged server list becomes the state.
 *
 * Consumers (cards, PDP, search, wishlist page, header count) all read the same
 * `items` shape, so none of them need to know whether we're online.
 */
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(readInitial);
  const [loading, setLoading] = useState(false);
  const prevUser = useRef(undefined); // undefined = first run

  // Persist to localStorage (guest store + logged-in cache).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [items]);

  // Sync across tabs.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(readInitial());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // React to auth state: merge-on-login / load server, or clear on logout.
  useEffect(() => {
    const was = prevUser.current;
    prevUser.current = user;
    let cancelled = false;

    async function syncWithServer() {
      setLoading(true);
      try {
        // 1. Fetch the server's list (the source of truth).
        const saved = await getSavedItems();
        let products = saved.map((s) => s.product).filter(Boolean);
        const serverIds = new Set(products.map((p) => p._id));

        // 2. Merge only genuine guest saves — items held locally that the
        //    server doesn't already have (avoids re-adding, so no duplicate
        //    requests on every reload).
        const toMerge = readInitial().filter((p) => p._id && !serverIds.has(p._id));
        if (toMerge.length) {
          await Promise.allSettled(toMerge.map((p) => addSavedItem(p._id)));
          const merged = await getSavedItems();
          products = merged.map((s) => s.product).filter(Boolean);
        }

        if (!cancelled) setItems(products);
      } catch {
        // Offline / request failed: keep whatever we have locally.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (user) {
      // Logged in (either on mount or just after login) → sync.
      syncWithServer();
    } else if (was) {
      // Transitioned to logged-out → clear so we never leak the ex-user's list.
      setItems([]);
    }
    // First run as a guest: keep the localStorage items as-is.

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    (product) => {
      const id = typeof product === "string" ? product : product?._id;
      if (!id) return;

      const wasSaved = items.some((p) => p._id === id);

      // Optimistic update — the heart flips instantly everywhere.
      setItems((prev) =>
        wasSaved
          ? prev.filter((p) => p._id !== id)
          : [toSnapshot(typeof product === "string" ? { _id: product } : product), ...prev]
      );

      if (!user) return; // guest: localStorage only

      const request = wasSaved ? removeSavedItemByProduct(id) : addSavedItem(id);
      request.catch(() => {
        // Reconcile on failure by reverting the optimistic change.
        setItems((prev) =>
          wasSaved
            ? [toSnapshot(typeof product === "string" ? { _id: product } : product), ...prev]
            : prev.filter((p) => p._id !== id)
        );
      });
    },
    [items, user]
  );

  const remove = useCallback(
    (id) => {
      if (!id) return;
      const removed = items.find((p) => p._id === id);
      setItems((prev) => prev.filter((p) => p._id !== id));
      if (user && removed) {
        removeSavedItemByProduct(id).catch(() =>
          setItems((prev) => (prev.some((p) => p._id === id) ? prev : [removed, ...prev]))
        );
      }
    },
    [items, user]
  );

  const clear = useCallback(() => {
    const snapshot = items;
    setItems([]);
    if (user && snapshot.length) {
      Promise.allSettled(snapshot.map((p) => removeSavedItemByProduct(p._id))).then(
        () => {}
      );
    }
  }, [items, user]);

  const isSaved = useCallback((id) => items.some((p) => p._id === id), [items]);

  const value = useMemo(
    () => ({ items, count: items.length, loading, toggle, remove, clear, isSaved }),
    [items, loading, toggle, remove, clear, isSaved]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
