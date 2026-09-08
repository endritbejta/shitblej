import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import client from "./client";
import { UNAUTHORIZED_EVENT, getToken, setToken } from "../lib/authToken";

// Drive the interceptors directly rather than over the network: what matters
// is what the client does with a response, not that axios can make a request.
const onResponseError = client.interceptors.response.handlers.find(
  (handler) => typeof handler.rejected === "function"
).rejected;

const onRequest = client.interceptors.request.handlers[0].fulfilled;

const apiError = (status, url) => ({
  response: { status, data: { error: "nope" } },
  config: { url },
});

describe("request interceptor", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("attaches the bearer token when there is one", async () => {
    setToken("a-token", { remember: true });
    const config = await onRequest({
      headers: {},
    });
    expect(config.headers.Authorization).toBe("Bearer a-token");
  });

  it("sends no Authorization header when logged out", async () => {
    const config = await onRequest({
      headers: {},
    });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("leaves FormData to set its own Content-Type (multipart boundary)", async () => {
    const config = await onRequest({
      headers: {},
      data: new FormData(),
    });
    expect(config.headers["Content-Type"]).toBeUndefined();
  });
});

describe("401 handling", () => {
  let unauthorized;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setToken("expired-token", { remember: true });
    unauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized);
  });

  afterEach(() => {
    window.removeEventListener(UNAUTHORIZED_EVENT, unauthorized);
  });

  // Before this, nothing handled 401 at all: the app kept its stale user and
  // every subsequent request failed silently until a manual reload.
  it("clears the token and announces the dead session", async () => {
    await expect(
      onResponseError(apiError(401, "/messages/conversations"))
    ).rejects.toBeTruthy();

    expect(getToken()).toBeNull();
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it("leaves a failed login alone - that 401 means bad credentials", async () => {
    await expect(
      onResponseError(apiError(401, "/users/login"))
    ).rejects.toBeTruthy();

    // The form needs to show "Invalid credentials"; logging the user out of a
    // session they never had would be nonsense.
    expect(getToken()).toBe("expired-token");
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("leaves a failed registration alone for the same reason", async () => {
    await expect(
      onResponseError(apiError(401, "/users/register"))
    ).rejects.toBeTruthy();

    expect(getToken()).toBe("expired-token");
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("ignores other error statuses", async () => {
    for (const status of [400, 403, 404, 409, 429, 500]) {
      await expect(
        onResponseError(apiError(status, "/products"))
      ).rejects.toBeTruthy();
    }

    expect(getToken()).toBe("expired-token");
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("ignores a network error with no response", async () => {
    await expect(
      onResponseError({ config: { url: "/products" }, message: "offline" })
    ).rejects.toBeTruthy();

    expect(getToken()).toBe("expired-token");
    expect(unauthorized).not.toHaveBeenCalled();
  });
});
