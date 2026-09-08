import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake socket per connection, so tests can assert on disconnect calls.
const created = [];
vi.mock("socket.io-client", () => ({
  io: vi.fn((url, opts) => {
    const socket = { url, opts, disconnect: vi.fn() };
    created.push(socket);
    return socket;
  }),
}));

const { io } = await import("socket.io-client");
const { getSocket, disconnectSocket } = await import("./socket");
const { setToken, clearSession } = await import("./authToken");

beforeEach(() => {
  disconnectSocket();
  created.length = 0;
  io.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});

describe("getSocket", () => {
  it("returns null when logged out", () => {
    expect(getSocket()).toBeNull();
    expect(io).not.toHaveBeenCalled();
  });

  it("connects once and reuses the connection for the same token", () => {
    setToken("token-a", { remember: true });

    const first = getSocket();
    const second = getSocket();

    expect(first).toBe(second);
    expect(io).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[0][1].auth).toEqual({ token: "token-a" });
  });

  it("reconnects with the new token when the session changes", () => {
    setToken("token-a", { remember: true });
    const first = getSocket();

    setToken("token-b", { remember: true });
    const second = getSocket();

    expect(second).not.toBe(first);
    // The old connection is authenticated as the old user - it has to go.
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[1][1].auth).toEqual({ token: "token-b" });
  });

  it("tears down the connection once the token is gone", () => {
    setToken("token-a", { remember: true });
    const socket = getSocket();

    clearSession();

    expect(getSocket()).toBeNull();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("disconnectSocket", () => {
  // The bug this covers: nothing called disconnectSocket, so after logout the
  // socket stayed connected and authenticated as the previous user - still
  // joined to their room, still receiving their messages and notifications in
  // that tab until a reload. AuthContext.endSession now calls it.
  it("disconnects and forgets the socket", () => {
    setToken("token-a", { remember: true });
    const socket = getSocket();

    disconnectSocket();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);

    // A later getSocket must open a fresh connection, not hand back the dead one.
    setToken("token-a", { remember: true });
    const next = getSocket();
    expect(next).not.toBe(socket);
  });

  it("is safe to call when nothing is connected", () => {
    expect(() => disconnectSocket()).not.toThrow();
  });
});
