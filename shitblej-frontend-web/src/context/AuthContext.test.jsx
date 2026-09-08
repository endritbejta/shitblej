import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import {
  UNAUTHORIZED_EVENT,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
} from "../lib/authToken";

// The provider calls this on mount; each test decides how it answers.
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));
// Keep the socket out of it - covered by lib/socket.test.js.
//
// socketHandle, not socket: this provider deliberately imports the handle
// module so that socket.io-client stays out of the entry bundle. The behaviour
// asserted below is unchanged - the connection still closes on 401 - only the
// module that owns it moved.
vi.mock("../lib/socketHandle", () => ({ disconnectSocket: vi.fn() }));

const { getCurrentUser } = await import("../api/auth");
const { disconnectSocket } = await import("../lib/socketHandle");

const ALICE = { _id: "u1", name: "Alice", email: "alice@example.com" };
const ALICE_FRESH = { ...ALICE, name: "Alice Renamed" };

// Renders the auth state as text so assertions read like what a user sees.
function Probe() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="who">{user ? user.name : "guest"}</span>
      <span data-testid="loading">{loading ? "revalidating" : "settled"}</span>
    </div>
  );
}

const renderApp = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("first paint", () => {
  // The regression this guards: the provider used to render `{!loading &&
  // children}`, so nothing at all painted until the auth round-trip finished -
  // measured at ~14s of blank page against a cold backend, on public pages too.
  it("renders children immediately while revalidating", () => {
    setToken("t", { remember: true });
    // A request that never settles - the app must not wait for it.
    getCurrentUser.mockReturnValue(new Promise(() => {}));

    renderApp();

    expect(screen.getByTestId("loading").textContent).toBe("revalidating");
    expect(screen.getByTestId("who")).not.toBeNull();
  });

  it("hydrates the signed-in user synchronously from cache", () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    getCurrentUser.mockReturnValue(new Promise(() => {}));

    renderApp();

    // Correct chrome on the very first render, with no API answer yet.
    expect(screen.getByTestId("who").textContent).toBe("Alice");
  });

  it("is settled immediately for a guest, with no API call", () => {
    renderApp();

    expect(screen.getByTestId("who").textContent).toBe("guest");
    expect(screen.getByTestId("loading").textContent).toBe("settled");
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});

describe("revalidation", () => {
  it("replaces the hydrated profile with the server's copy", async () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue(ALICE_FRESH);

    renderApp();
    expect(screen.getByTestId("who").textContent).toBe("Alice");

    await waitFor(() =>
      expect(screen.getByTestId("who").textContent).toBe("Alice Renamed")
    );
    // ...and the refreshed copy is what the next load will hydrate.
    expect(getCachedUser()).toEqual(ALICE_FRESH);
    expect(screen.getByTestId("loading").textContent).toBe("settled");
  });

  it("keeps the session when revalidation fails on a network error", async () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    getCurrentUser.mockRejectedValue(new Error("Network Error"));

    renderApp();

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("settled")
    );

    // This used to sign the user out: the old catch() cleared the session on
    // ANY failure, so a sleeping backend logged people out. Only a 401 is
    // evidence the session is dead, and the API client owns that path.
    expect(screen.getByTestId("who").textContent).toBe("Alice");
    expect(getToken()).toBe("t");
  });
});

describe("session end", () => {
  it("clears everything when the API reports 401", async () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    getCurrentUser.mockResolvedValue(ALICE);

    renderApp();
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Alice"));

    // What api/client.jsx dispatches after a 401.
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));

    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));
    expect(getToken()).toBeNull();
    expect(getCachedUser()).toBeNull();
    // The socket is authenticated for its lifetime, so it has to go too.
    expect(disconnectSocket).toHaveBeenCalled();
  });
});
