import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
} from "./authToken";

const ALICE = { _id: "u1", name: "Alice", email: "alice@example.com" };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("token storage", () => {
  it("remembers across sessions when asked to", () => {
    setToken("t", { remember: true });
    expect(localStorage.getItem("token")).toBe("t");
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(getToken()).toBe("t");
  });

  it("keeps the token to the tab when not remembering", () => {
    setToken("t", { remember: false });
    expect(sessionStorage.getItem("token")).toBe("t");
    expect(localStorage.getItem("token")).toBeNull();
    expect(getToken()).toBe("t");
  });

  it("does not hand back the strings a bad write leaves behind", () => {
    localStorage.setItem("token", "undefined");
    expect(getToken()).toBeNull();
    localStorage.setItem("token", "null");
    expect(getToken()).toBeNull();
  });

  it("switching remember mode does not leave the old copy behind", () => {
    setToken("t1", { remember: true });
    setToken("t2", { remember: false });
    expect(localStorage.getItem("token")).toBeNull();
    expect(getToken()).toBe("t2");
  });
});

describe("cached profile", () => {
  // This cache is what lets the app render the right chrome on first paint
  // instead of blocking on the API or flashing signed-out.
  it("round-trips the profile", () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    expect(getCachedUser()).toEqual(ALICE);
  });

  it("follows the token into sessionStorage when not remembering", () => {
    setToken("t", { remember: false });
    setCachedUser(ALICE);

    // "Remember me" off has to mean the profile dies with the tab too.
    expect(localStorage.getItem("user")).toBeNull();
    expect(sessionStorage.getItem("user")).not.toBeNull();
    expect(getCachedUser()).toEqual(ALICE);
  });

  it("treats an id-less object as absent rather than half-hydrating", () => {
    localStorage.setItem("user", JSON.stringify({ name: "No id" }));
    expect(getCachedUser()).toBeNull();
  });

  it("survives corrupted JSON", () => {
    localStorage.setItem("user", "{not json");
    expect(getCachedUser()).toBeNull();
  });

  it("clears from both stores", () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);
    setCachedUser(null);
    expect(getCachedUser()).toBeNull();
  });
});

describe("clearSession", () => {
  it("removes the token and the profile together", () => {
    setToken("t", { remember: true });
    setCachedUser(ALICE);

    clearSession();

    // Clearing one without the other would leave the app hydrating a user it
    // cannot authenticate.
    expect(getToken()).toBeNull();
    expect(getCachedUser()).toBeNull();
  });

  it("clears both storage backends", () => {
    localStorage.setItem("token", "a");
    localStorage.setItem("user", JSON.stringify(ALICE));
    sessionStorage.setItem("token", "b");
    sessionStorage.setItem("user", JSON.stringify(ALICE));

    clearSession();

    for (const store of [localStorage, sessionStorage]) {
      expect(store.getItem("token")).toBeNull();
      expect(store.getItem("user")).toBeNull();
    }
  });
});
