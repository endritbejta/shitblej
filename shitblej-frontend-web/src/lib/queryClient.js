import { QueryClient } from "@tanstack/react-query";

/**
 * The shared query cache.
 *
 * Introduced to stop re-fetching data the app already has. Switching between
 * chats refetched the thread every time and cleared the messages first, so a
 * conversation you had open seconds ago flashed its skeleton before redrawing
 * identical content. A cache makes the second visit instant and moves the
 * refetch behind the already-rendered content.
 *
 * Every read is on it now except WishlistContext, which is deliberately not a
 * cache: it is a hybrid store that keeps a guest's saves in localStorage,
 * treats the server as the source of truth once signed in, merges the two on
 * login and reverts failed optimistic toggles. Those are store semantics, not
 * caching, and rewriting them against a query cache would be risk without
 * gain.
 */

// Retrying an authorization failure is pointless - the answer will not change -
// and a 401 is already handled globally by the API client, which ends the
// session and raises auth:unauthorized. Retrying it would fire that repeatedly.
const isClientError = (error) => {
  const status = error?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
};

// Exported so tests can build a throwaway client on the SAME defaults rather
// than a lookalike. A test that invents its own staleTime measures the test's
// configuration, not the app's.
export const defaultQueryOptions = {
  queries: {
    // Data stays fresh for half a minute. The socket pushes chat updates as
    // they happen and writes them straight into the cache, so this window is
    // about avoiding redundant fetches rather than about latency.
    staleTime: 30_000,

    // How long an unused thread survives in the cache. Switching away and
    // back inside this window costs nothing.
    gcTime: 5 * 60_000,

    // Coming back to the tab should catch up on anything the socket missed
    // while it was in the background.
    refetchOnWindowFocus: true,

    // Refetching purely because a component remounted defeats the point of
    // the cache; staleTime already decides when data is worth re-reading.
    refetchOnMount: false,

    retry: (failureCount, error) => (isClientError(error) ? false : failureCount < 2),
  },
  mutations: {
    retry: false,
  },
};

export const queryClient = new QueryClient({ defaultOptions: defaultQueryOptions });

// Query keys in one place, so an invalidation cannot silently miss by
// mistyping a key.
export const queryKeys = {
  conversations: ["conversations"],
  thread: (partnerId) => ["messages", String(partnerId)],

  // Product reads share a "products" prefix so one invalidation after a
  // listing changes can reach the home rails, a category and a search at once:
  //   queryClient.invalidateQueries({ queryKey: ["products"] })
  products: (params = {}) => ["products", params],
  product: (id) => ["products", "detail", String(id)],
  productSearch: (term) => ["products", "search", term],
  sellerProducts: (userId) => ["products", "seller", String(userId)],
};
