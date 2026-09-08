import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "./AuthContext";
import { AuthProvider } from "./AuthContext";
import { WishlistProvider, useWishlist } from "./WishlistContext";
import { clearSession, setCachedUser, setToken } from "../lib/authToken";

// The real AuthProvider is used on purpose. This whole feature is about
// reacting to an authentication transition, so mocking `useAuth` would mock
// away the thing under test.
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("../lib/socketHandle", () => ({ disconnectSocket: vi.fn() }));
vi.mock("../api/savedItems", () => ({
  getSavedItems: vi.fn(),
  addSavedItem: vi.fn(),
  removeSavedItemByProduct: vi.fn(),
}));

const { getCurrentUser, login: apiLogin } = await import("../api/auth");
const { getSavedItems, addSavedItem, removeSavedItemByProduct } = await import(
  "../api/savedItems"
);

const ALICE = { _id: "alice", name: "Alice", email: "alice@example.com" };
const BOB = { _id: "bob", name: "Bob", email: "bob@example.com" };

// Products, as the app models them: the canonical identity is `_id`.
const A = { _id: "pA", name: "Product A", price: 10 };
const B = { _id: "pB", name: "Product B", price: 20 };
const C = { _id: "pC", name: "Product C", price: 30 };
const D = { _id: "pD", name: "Product D", price: 40 };

/** The server returns SavedItem records that populate `product`. */
const asSavedItems = (products) =>
  products.map((p) => ({ _id: `s-${p._id}`, product: p }));

const GUEST_KEY = "wishlist:guest";
const cacheKey = (userId) => `wishlist:user:${userId}`;

const idsIn = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return raw.map((p) => (typeof p === "string" ? p : p._id));
  } catch {
    return [];
  }
};
/** Pending guest saves - only ever written while signed out. */
const storedIds = () => idsIn(GUEST_KEY);
/** A given user's render cache. */
const cachedIds = (userId) => idsIn(cacheKey(userId));

/** Seed the guest store, as a signed-out visitor's saves. */
const seedGuest = (products) =>
  localStorage.setItem(GUEST_KEY, JSON.stringify(products));

// Renders the wishlist the way every consumer sees it - one shared state.
function Probe() {
  const { items, count, toggle } = useWishlist();
  const { user } = useAuth();
  return (
    <div>
      <span data-testid="who">{user ? user.name : "guest"}</span>
      <span data-testid="count">{count}</span>
      <span data-testid="ids">{items.map((p) => p._id).join(",")}</span>
      <button onClick={() => toggle(A)}>toggle A</button>
      <button onClick={() => toggle(B)}>toggle B</button>
    </div>
  );
}

/** Exposes login/logout so a test can change auth without a remount. */
let authActions;
function AuthActions() {
  const { login, logout } = useAuth();
  authActions = { login, logout };
  return null;
}

const renderApp = () =>
  render(
    <AuthProvider>
      <WishlistProvider>
        <AuthActions />
        <Probe />
      </WishlistProvider>
    </AuthProvider>
  );

const ids = () => screen.getByTestId("ids").textContent;
const count = () => screen.getByTestId("count").textContent;

/** Sign in during the current session, with no remount. */
const signIn = async (user) => {
  apiLogin.mockResolvedValue({ token: `token-${user._id}`, data: user });
  getCurrentUser.mockResolvedValue(user);
  await act(async () => {
    await authActions.login(user.email, "pw");
  });
};

const signOut = async () => {
  await act(async () => {
    authActions.logout();
  });
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  getSavedItems.mockResolvedValue([]);
  addSavedItem.mockResolvedValue({});
  removeSavedItemByProduct.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  clearSession();
});

describe("guest wishlist", () => {
  it("saves to localStorage and needs no API call", async () => {
    renderApp();

    await act(async () => {
      screen.getByText("toggle A").click();
    });

    expect(ids()).toBe("pA");
    expect(storedIds()).toEqual(["pA"]);
    // A guest has no account to persist to; calling the API would 401.
    expect(getSavedItems).not.toHaveBeenCalled();
    expect(addSavedItem).not.toHaveBeenCalled();
  });

  it("survives a reload", async () => {
    seedGuest([A, B]);
    renderApp();
    await waitFor(() => expect(count()).toBe("2"));
    expect(ids()).toBe("pA,pB");
  });
});

describe("guest -> authenticated, without a refresh", () => {
  it("TEST 1: empty guest + empty server stays empty", async () => {
    renderApp();
    await signIn(ALICE);

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));
    expect(count()).toBe("0");
    expect(addSavedItem).not.toHaveBeenCalled();
  });

  it("TEST 2: guest [A,B] + empty server persists both", async () => {
    seedGuest([A, B]);
    renderApp();
    await waitFor(() => expect(count()).toBe("2"));

    // The server is empty first, then returns what the merge wrote.
    getSavedItems
      .mockResolvedValueOnce([])
      .mockResolvedValue(asSavedItems([A, B]));

    await signIn(ALICE);

    await waitFor(() => expect(count()).toBe("2"));
    expect(addSavedItem.mock.calls.map((c) => c[0]).sort()).toEqual(["pA", "pB"]);
    expect(ids().split(",").sort()).toEqual(["pA", "pB"]);
  });

  it("TEST 3: guest [A,B] + server [B,C] merges to [A,B,C] with no duplicate B", async () => {
    seedGuest([A, B]);
    renderApp();
    await waitFor(() => expect(count()).toBe("2"));

    getSavedItems
      .mockResolvedValueOnce(asSavedItems([B, C]))
      .mockResolvedValue(asSavedItems([A, B, C]));

    await signIn(ALICE);

    await waitFor(() => expect(count()).toBe("3"));
    expect(ids().split(",").sort()).toEqual(["pA", "pB", "pC"]);
    // B was already on the server; re-adding it would be a 400.
    expect(addSavedItem.mock.calls.map((c) => c[0])).toEqual(["pA"]);
  });

  it("TEST 5: every consumer reflects the merged state immediately", async () => {
    renderApp();

    // Guest saves A through the UI.
    await act(async () => {
      screen.getByText("toggle A").click();
    });
    expect(ids()).toBe("pA");

    // The account already has D.
    getSavedItems
      .mockResolvedValueOnce(asSavedItems([D]))
      .mockResolvedValue(asSavedItems([A, D]));

    await signIn(ALICE);

    // No remount anywhere - the shared state updated in place.
    await waitFor(() => expect(count()).toBe("2"));
    expect(ids().split(",").sort()).toEqual(["pA", "pD"]);
  });
});

describe("failure handling", () => {
  it("TEST 4: keeps the guest list when the merge fails", async () => {
    seedGuest([A]);
    renderApp();
    await waitFor(() => expect(count()).toBe("1"));

    getSavedItems.mockRejectedValue(new Error("network down"));

    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    // The guest's save must not be silently dropped.
    expect(storedIds()).toEqual(["pA"]);
    expect(ids()).toBe("pA");
  });

  it("does not clear the guest store before the server confirms", async () => {
    seedGuest([A]);
    renderApp();
    await waitFor(() => expect(count()).toBe("1"));

    getSavedItems.mockResolvedValueOnce([]);
    addSavedItem.mockRejectedValue(new Error("write failed"));

    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    // The add failed, so A is still only ours to keep.
    expect(storedIds()).toContain("pA");
  });
});

describe("cross-user isolation", () => {
  it("TEST 6: user B never sees user A's wishlist", async () => {
    renderApp();

    getSavedItems.mockResolvedValue(asSavedItems([A, B]));
    await signIn(ALICE);
    await waitFor(() => expect(count()).toBe("2"));

    await signOut();
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));

    // Bob's account holds only D.
    getSavedItems.mockResolvedValue(asSavedItems([D]));
    await signIn(BOB);

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Bob"));
    await waitFor(() => expect(ids()).toBe("pD"));
    // Alice's items must not have been written into Bob's account.
    expect(addSavedItem).not.toHaveBeenCalled();
  });

  it("TEST 8: logging out and back in does not duplicate or re-add", async () => {
    renderApp();

    getSavedItems.mockResolvedValue(asSavedItems([A, B]));
    await signIn(ALICE);
    await waitFor(() => expect(count()).toBe("2"));

    await signOut();
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));

    await signIn(ALICE);
    await waitFor(() => expect(count()).toBe("2"));

    expect(ids().split(",").sort()).toEqual(["pA", "pB"]);
    // Nothing to merge: the server already had both.
    expect(addSavedItem).not.toHaveBeenCalled();
  });
});

describe("returning authenticated user", () => {
  it("TEST 7: a reload keeps the merged list and re-adds nothing", async () => {
    // Simulate a fresh page load with a live session.
    setToken("token-alice");
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue(ALICE);
    getSavedItems.mockResolvedValue(asSavedItems([A, B, C]));

    renderApp();

    await waitFor(() => expect(count()).toBe("3"));
    expect(ids().split(",").sort()).toEqual(["pA", "pB", "pC"]);
    expect(addSavedItem).not.toHaveBeenCalled();
  });

  it("does not resurrect an item removed on another device", async () => {
    // The cache holds [A,B] from a previous session; the server now has only A
    // because B was removed elsewhere. B must stay removed - a cache is a
    // render optimisation, never a queue of things to re-add.
    localStorage.setItem(cacheKey("alice"), JSON.stringify([A, B]));
    setToken("token-alice");
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue(ALICE);
    getSavedItems.mockResolvedValue(asSavedItems([A]));

    renderApp();

    await waitFor(() => expect(ids()).toBe("pA"));
    expect(addSavedItem).not.toHaveBeenCalled();
  });
});

describe("race conditions", () => {
  it("TEST 9: one sync per authenticated identity, not per user-object change", async () => {
    setToken("token-alice");
    setCachedUser(ALICE);
    // Revalidation returns a NEW object for the same person, which is what the
    // real provider does after getCurrentUser resolves.
    getCurrentUser.mockResolvedValue({ ...ALICE, name: "Alice Renamed" });
    getSavedItems.mockResolvedValue(asSavedItems([A]));

    renderApp();

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice Renamed"));
    await waitFor(() => expect(ids()).toBe("pA"));

    // Same identity throughout, so the server list should have been fetched
    // once - not again for every fresh user object.
    expect(getSavedItems).toHaveBeenCalledTimes(1);
  });
});

describe("shared-browser leakage", () => {
  it("does not show a previous user's wishlist to the next visitor", async () => {
    // How this happens for real: "remember me" is UNCHECKED by default, so the
    // token lives in sessionStorage and dies with the tab - but the wishlist
    // cache is written to localStorage, which does not. The next person to
    // open the browser is a guest holding the previous user's saves.
    // Alice's render cache, left behind under her own key.
    localStorage.setItem(cacheKey("alice"), JSON.stringify([A, B]));
    // No token: her session died with the tab (remember-me is off by default).

    renderApp();

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));
    expect(ids()).toBe("");
    expect(count()).toBe("0");
  });

  it("does not merge a previous user's cache into the next account", async () => {
    localStorage.setItem(cacheKey("alice"), JSON.stringify([A, B]));
    renderApp();
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));

    getSavedItems.mockResolvedValue(asSavedItems([D])); // Bob's own list
    await signIn(BOB);

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Bob"));
    await waitFor(() => expect(ids()).toBe("pD"));
    // Alice's products must never reach Bob's account.
    expect(addSavedItem).not.toHaveBeenCalled();
  });
});

describe("concurrent sync", () => {
  it("a slow first fetch cannot overwrite the merged result", async () => {
    // Two syncs overlap because the effect keys on the user OBJECT: the cached
    // user renders one, then revalidation supplies a fresh object for the same
    // person and renders another. If the first sync's pre-merge fetch resolves
    // last, it writes the UNMERGED list - and the persist effect then commits
    // that loss to storage.
    seedGuest([A]);
    setToken("token-alice");
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue({ ...ALICE, name: "Alice Again" });

    let releaseFirst;
    const firstFetch = new Promise((resolve) => {
      releaseFirst = () => resolve(asSavedItems([C])); // pre-merge: no A
    });
    getSavedItems
      .mockReturnValueOnce(firstFetch)
      .mockResolvedValue(asSavedItems([A, C])); // everything after: merged

    renderApp();

    // Let any later sync finish first, then release the stale one.
    await waitFor(() => expect(getSavedItems.mock.calls.length).toBeGreaterThan(0));
    await act(async () => {
      releaseFirst();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice Again"));
    // A must still be there; the stale fetch must not win.
    await waitFor(() => expect(ids().split(",").sort()).toEqual(["pA", "pC"]));
    expect(cachedIds("alice").sort()).toEqual(["pA", "pC"]);
  });
});

describe("migration from the single-key format", () => {
  it("treats a legacy key as guest saves when the page boots signed out", async () => {
    localStorage.setItem("wishlist", JSON.stringify([A, B]));
    renderApp();

    await waitFor(() => expect(count()).toBe("2"));
    // Moved to the guest store, and the ambiguous key is gone.
    expect(storedIds().sort()).toEqual(["pA", "pB"]);
    expect(localStorage.getItem("wishlist")).toBeNull();
  });

  it("treats a legacy key as that user's cache when the page boots signed in", async () => {
    // The same bytes mean something different here, which is exactly why the
    // old single key was unsafe: as a guest store it would be merged into
    // whoever signs in next.
    localStorage.setItem("wishlist", JSON.stringify([A, B]));
    setToken("token-alice");
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue(ALICE);
    getSavedItems.mockResolvedValue(asSavedItems([A, B]));

    renderApp();

    await waitFor(() => expect(count()).toBe("2"));
    expect(cachedIds("alice").sort()).toEqual(["pA", "pB"]);
    // Not sitting in the guest store waiting to be merged into another account.
    expect(storedIds()).toEqual([]);
    expect(localStorage.getItem("wishlist")).toBeNull();
  });

  it("supports the original id-only array", async () => {
    localStorage.setItem("wishlist", JSON.stringify(["pA", "pB"]));
    renderApp();
    await waitFor(() => expect(count()).toBe("2"));
    expect(ids().split(",").sort()).toEqual(["pA", "pB"]);
  });
});

describe("switching account without signing out", () => {
  it("loads the new account and carries nothing across", async () => {
    renderApp();

    getSavedItems.mockResolvedValue(asSavedItems([A, B]));
    await signIn(ALICE);
    await waitFor(() => expect(count()).toBe("2"));

    // Straight from Alice to Bob, no guest step in between.
    getSavedItems.mockResolvedValue(asSavedItems([D]));
    await signIn(BOB);

    await waitFor(() => expect(ids()).toBe("pD"));
    expect(addSavedItem).not.toHaveBeenCalled();
    // Alice's cache is untouched under her own key, ready for her next visit.
    expect(cachedIds("alice").sort()).toEqual(["pA", "pB"]);
    expect(cachedIds("bob")).toEqual(["pD"]);
  });
});

describe("retry after a failed merge", () => {
  it("merges on the next sign-in instead of losing the saves", async () => {
    seedGuest([A]);
    renderApp();
    await waitFor(() => expect(count()).toBe("1"));

    // First attempt: the account is unreachable.
    getSavedItems.mockRejectedValue(new Error("offline"));
    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));
    expect(storedIds()).toEqual(["pA"]);

    // Sign out and back in; this time the account answers.
    await signOut();
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));

    getSavedItems.mockReset();
    getSavedItems
      .mockResolvedValueOnce([])
      .mockResolvedValue(asSavedItems([A]));
    addSavedItem.mockResolvedValue({});

    await signIn(ALICE);

    await waitFor(() => expect(ids()).toBe("pA"));
    expect(addSavedItem.mock.calls.map((c) => c[0])).toEqual(["pA"]);
    // Now safely on the account, so the guest store is emptied.
    expect(storedIds()).toEqual([]);
  });

  it("keeps only the items that failed, not the ones that landed", async () => {
    seedGuest([A, B]);
    renderApp();
    await waitFor(() => expect(count()).toBe("2"));

    getSavedItems
      .mockResolvedValueOnce([])
      .mockResolvedValue(asSavedItems([A]));
    // A saves; B hits a transient server error.
    addSavedItem.mockImplementation((id) =>
      id === "pA" ? Promise.resolve({}) : Promise.reject({ response: { status: 503 } })
    );

    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    // Only B is still pending - A must not be re-added next time.
    await waitFor(() => expect(storedIds()).toEqual(["pB"]));
  });

  it("drops an item whose product no longer exists", async () => {
    seedGuest([A]);
    renderApp();
    await waitFor(() => expect(count()).toBe("1"));

    getSavedItems.mockResolvedValueOnce([]).mockResolvedValue([]);
    // The product was deleted while it sat in the guest store.
    addSavedItem.mockRejectedValue({ response: { status: 404 } });

    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    // Retrying this forever would 404 on every sign-in.
    await waitFor(() => expect(storedIds()).toEqual([]));
  });
});

describe("rapid toggles in one tick", () => {
  it("saving two products back to back keeps both", async () => {
    // React state does not update between two clicks in the same tick, so
    // deriving the next list from the rendered `items` made the second click
    // overwrite the first. Found by clicking two hearts in a real browser.
    renderApp();

    await act(async () => {
      screen.getByText("toggle A").click();
      screen.getByText("toggle B").click();
    });

    expect(ids().split(",").sort()).toEqual(["pA", "pB"]);
    expect(count()).toBe("2");
    expect(storedIds().sort()).toEqual(["pA", "pB"]);
  });

  it("does the same for an authenticated user, and persists both", async () => {
    renderApp();
    getSavedItems.mockResolvedValue([]);
    await signIn(ALICE);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    await act(async () => {
      screen.getByText("toggle A").click();
      screen.getByText("toggle B").click();
    });

    expect(ids().split(",").sort()).toEqual(["pA", "pB"]);
    expect(addSavedItem.mock.calls.map((c) => c[0]).sort()).toEqual(["pA", "pB"]);
    expect(cachedIds("alice").sort()).toEqual(["pA", "pB"]);
  });

  it("save then immediately unsave leaves nothing", async () => {
    renderApp();

    await act(async () => {
      screen.getByText("toggle A").click();
      screen.getByText("toggle A").click();
    });

    expect(ids()).toBe("");
    expect(storedIds()).toEqual([]);
  });
});
