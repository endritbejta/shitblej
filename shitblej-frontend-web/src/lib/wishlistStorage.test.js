import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  guestKey,
  keyFor,
  mergeById,
  migrateLegacyKey,
  readList,
  removeKey,
  userKey,
  writeList,
} from "./wishlistStorage";

const A = { _id: "pA", name: "Product A" };
const B = { _id: "pB", name: "Product B" };
const C = { _id: "pC", name: "Product C" };

beforeEach(() => {
  localStorage.clear();
});

describe("keys", () => {
  it("separates the guest store from each user's cache", () => {
    // The whole point: one key per identity, so no two identities can read
    // each other's list.
    expect(keyFor(null)).toBe(guestKey());
    expect(keyFor("alice")).toBe(userKey("alice"));
    expect(keyFor("alice")).not.toBe(keyFor("bob"));
    expect(keyFor("alice")).not.toBe(guestKey());
  });
});

describe("readList", () => {
  it("reads snapshot objects", () => {
    writeList("k", [A, B]);
    expect(readList("k").map((p) => p._id)).toEqual(["pA", "pB"]);
  });

  it("migrates the original id-only format", () => {
    localStorage.setItem("k", JSON.stringify(["pA", "pB"]));
    expect(readList("k")).toEqual([{ _id: "pA" }, { _id: "pB" }]);
  });

  it("drops entries with no product id", () => {
    localStorage.setItem("k", JSON.stringify([A, null, {}, { name: "no id" }, B]));
    expect(readList("k").map((p) => p._id)).toEqual(["pA", "pB"]);
  });

  it.each([
    ["missing", null],
    ["malformed JSON", "{not json"],
    ["not an array", '{"a":1}'],
    ["empty string", ""],
  ])("returns [] for %s", (_label, raw) => {
    if (raw !== null) localStorage.setItem("k", raw);
    expect(readList("k")).toEqual([]);
  });

  it("survives storage throwing outright", () => {
    // Browsers set to block site data throw on access rather than returning
    // null. A wishlist is not worth a blank page.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });
    expect(readList("k")).toEqual([]);
    spy.mockRestore();
  });

  it("writeList survives storage throwing outright", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => writeList("k", [A])).not.toThrow();
    spy.mockRestore();
  });
});

describe("mergeById", () => {
  it("keeps one entry per product, primary first", () => {
    expect(mergeById([A, B], [B, C]).map((p) => p._id)).toEqual(["pA", "pB", "pC"]);
  });

  it("is idempotent", () => {
    const once = mergeById([A, B], [B, C]);
    expect(mergeById(once, once)).toEqual(once);
  });

  it("prefers the primary copy of a duplicate", () => {
    const stale = { _id: "pA", name: "Stale name" };
    expect(mergeById([A], [stale])[0].name).toBe("Product A");
  });

  it("ignores entries with no id", () => {
    expect(mergeById([A, null, {}], [undefined, B]).map((p) => p._id)).toEqual([
      "pA",
      "pB",
    ]);
  });

  it("handles empty inputs", () => {
    expect(mergeById([], [])).toEqual([]);
    expect(mergeById([A], [])).toEqual([A]);
    expect(mergeById([], [A])).toEqual([A]);
  });
});

describe("migrateLegacyKey", () => {
  it("moves a guest's list to the guest store", () => {
    localStorage.setItem("wishlist", JSON.stringify([A, B]));

    migrateLegacyKey(null);

    expect(readList(guestKey()).map((p) => p._id)).toEqual(["pA", "pB"]);
    expect(localStorage.getItem("wishlist")).toBeNull();
  });

  it("moves a signed-in user's list to their own cache, not the guest store", () => {
    // Identical bytes, opposite destination. This is the decision the single
    // key could not express, and getting it wrong is how one user's wishlist
    // ended up merged into the next user's account.
    localStorage.setItem("wishlist", JSON.stringify([A, B]));

    migrateLegacyKey("alice");

    expect(readList(userKey("alice")).map((p) => p._id)).toEqual(["pA", "pB"]);
    expect(readList(guestKey())).toEqual([]);
    expect(localStorage.getItem("wishlist")).toBeNull();
  });

  it("never overwrites a destination that already has data", () => {
    writeList(guestKey(), [C]);
    localStorage.setItem("wishlist", JSON.stringify([A, B]));

    migrateLegacyKey(null);

    expect(readList(guestKey()).map((p) => p._id)).toEqual(["pC"]);
    // Still cleans up, so it cannot run again.
    expect(localStorage.getItem("wishlist")).toBeNull();
  });

  it("is a no-op once there is nothing to migrate", () => {
    writeList(guestKey(), [A]);
    migrateLegacyKey(null);
    migrateLegacyKey(null);
    expect(readList(guestKey()).map((p) => p._id)).toEqual(["pA"]);
  });

  it("removes an empty legacy key without writing anything", () => {
    localStorage.setItem("wishlist", JSON.stringify([]));
    migrateLegacyKey(null);
    expect(localStorage.getItem("wishlist")).toBeNull();
    expect(localStorage.getItem(guestKey())).toBeNull();
  });
});

describe("removeKey", () => {
  it("deletes a key and tolerates a missing one", () => {
    writeList("k", [A]);
    removeKey("k");
    expect(localStorage.getItem("k")).toBeNull();
    expect(() => removeKey("k")).not.toThrow();
  });
});
