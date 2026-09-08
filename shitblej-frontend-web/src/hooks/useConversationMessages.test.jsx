import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useConversationMessages } from "./useConversationMessages";
import { defaultQueryOptions, queryKeys } from "../lib/queryClient";

vi.mock("../api/messages", () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
}));
// The socket is covered in lib/socket.test.js; here it stays out of the way.
vi.mock("../lib/socket", () => ({ getSocket: vi.fn(() => null) }));

const { getMessages, sendMessage } = await import("../api/messages");

const USER = { _id: "me" };
const ALICE = "alice";
const BOB = "bob";

const textMessage = (id, from, to) => ({
  _id: id,
  type: "text",
  text: `msg ${id}`,
  sender: from,
  receiver: to,
  createdAt: new Date().toISOString(),
});

let client;

// A fresh cache per test, with retries and focus refetching off so behaviour
// is deterministic rather than timing-dependent.
const wrapper = ({ children }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const renderThread = (partnerId) =>
  renderHook(({ partnerId: p }) => useConversationMessages({ user: USER, partnerId: p }), {
    wrapper,
    initialProps: { partnerId },
  });

beforeEach(() => {
  vi.clearAllMocks();
  // The app's own defaults, so these tests exercise the shipped configuration.
  // Only the two things that would make a test non-deterministic are overridden:
  // retries (a failure case would take three attempts) and focus refetching
  // (jsdom fires focus events during rendering).
  client = new QueryClient({
    defaultOptions: {
      ...defaultQueryOptions,
      queries: {
        ...defaultQueryOptions.queries,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe("switching conversations", () => {
  it("reports loading the first time a thread is opened", async () => {
    getMessages.mockResolvedValue({ data: [textMessage("a1", ALICE, "me")] });

    const { result } = renderThread(ALICE);

    // Nothing to show yet, so the skeleton is correct here.
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
  });

  // The bug: the thread was cleared and refetched on every switch, so
  // returning to a conversation you had open seconds ago flashed its skeleton
  // before redrawing identical content.
  it("never reports loading when reopening a cached thread", async () => {
    getMessages.mockImplementation(async (id) => ({
      data: [textMessage(`${id}-1`, id, "me")],
    }));

    const first = renderThread(ALICE);
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    // Reopen it: the cache already holds this thread.
    const second = renderThread(ALICE);
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.messages).toHaveLength(1);
  });

  it("keeps threads apart, so one conversation never shows another's messages", async () => {
    getMessages.mockImplementation(async (id) => ({
      data: [textMessage(`${id}-1`, id, "me")],
    }));

    const { result, rerender } = renderThread(ALICE);
    await waitFor(() => expect(result.current.messages[0]._id).toBe("alice-1"));

    rerender({ partnerId: BOB });
    await waitFor(() => expect(result.current.messages[0]._id).toBe("bob-1"));

    // And back to the first, from cache, with no loading state in between.
    rerender({ partnerId: ALICE });
    expect(result.current.loading).toBe(false);
    expect(result.current.messages[0]._id).toBe("alice-1");
  });

  it("fetches once per thread rather than on every switch", async () => {
    getMessages.mockImplementation(async (id) => ({
      data: [textMessage(`${id}-1`, id, "me")],
    }));

    const { result, rerender } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ partnerId: BOB });
    await waitFor(() => expect(result.current.messages[0]._id).toBe("bob-1"));
    rerender({ partnerId: ALICE });
    rerender({ partnerId: BOB });

    expect(getMessages).toHaveBeenCalledTimes(2);
  });

  it("does not fetch without a user or a partner", () => {
    renderHook(() => useConversationMessages({ user: null, partnerId: ALICE }), { wrapper });
    renderHook(() => useConversationMessages({ user: USER, partnerId: null }), { wrapper });
    expect(getMessages).not.toHaveBeenCalled();
  });
});

describe("sending", () => {
  it("shows the message immediately and reconciles with the server's copy", async () => {
    getMessages.mockResolvedValue({ data: [] });
    sendMessage.mockResolvedValue({ data: textMessage("real", "me", ALICE) });

    const { result } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.sendText("hello");

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    // The optimistic row is replaced, not duplicated.
    expect(result.current.messages[0]._id).toBe("real");
  });

  it("rolls the optimistic message back when the send fails", async () => {
    getMessages.mockResolvedValue({ data: [] });
    sendMessage.mockRejectedValue({ response: { data: { error: "nope" } } });

    const { result } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.sendText("hello");

    await waitFor(() => expect(result.current.messages).toHaveLength(0));
    expect(result.current.error).toBe("nope");
  });

  it("writes optimistic sends into the cache, so they survive a switch away", async () => {
    getMessages.mockImplementation(async () => ({ data: [] }));
    sendMessage.mockResolvedValue({ data: textMessage("real", "me", ALICE) });

    const { result, rerender } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.sendText("hello");
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    rerender({ partnerId: BOB });
    rerender({ partnerId: ALICE });

    // Local state would have lost this; the cache keeps it.
    expect(result.current.messages[0]._id).toBe("real");
  });
});

describe("the composer lock", () => {
  const acceptedOffer = (withOrder) => ({
    _id: "m1",
    type: "offer",
    text: "Offer",
    createdAt: new Date().toISOString(),
    offer: {
      _id: "o1",
      status: "accepted",
      createdAt: new Date().toISOString(),
      ...(withOrder
        ? { order: "order-1" }
        : { checkoutExpiresAt: new Date(Date.now() + 3600_000).toISOString() }),
    },
  });

  it("is locked with no agreement, and open once one exists", async () => {
    getMessages.mockResolvedValue({ data: [] });
    const locked = renderThread(ALICE);
    await waitFor(() => expect(locked.result.current.loading).toBe(false));
    expect(locked.result.current.lock).not.toBeNull();
    locked.unmount();

    getMessages.mockResolvedValue({ data: [acceptedOffer(false)] });
    const open = renderThread(BOB);
    await waitFor(() => expect(open.result.current.loading).toBe(false));
    // Accepted and inside the checkout window: the server allows text here.
    expect(open.result.current.lock).toBeNull();
  });

  it("takes the server's refusal over the mirrored hint", async () => {
    getMessages.mockResolvedValue({ data: [acceptedOffer(true)] });
    sendMessage.mockRejectedValue({
      response: { data: { code: "negotiation_required", error: "Server says no" } },
    });

    const { result } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lock).toBeNull();

    await result.current.sendText("hi");

    // The server decides; its copy replaces the hint.
    await waitFor(() => expect(result.current.lock?.message).toBe("Server says no"));

    result.current.clearLock();
    await waitFor(() => expect(result.current.lock).toBeNull());
  });

  it("does not carry one conversation's refusal into another", async () => {
    getMessages.mockResolvedValue({ data: [acceptedOffer(true)] });
    sendMessage.mockRejectedValue({
      response: { data: { code: "negotiation_required", error: "Server says no" } },
    });

    const { result, rerender } = renderThread(ALICE);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.sendText("hi");
    await waitFor(() => expect(result.current.lock?.message).toBe("Server says no"));

    rerender({ partnerId: BOB });

    await waitFor(() => expect(result.current.lock?.message).not.toBe("Server says no"));
  });
});

describe("cache keys", () => {
  it("are namespaced per partner", () => {
    expect(queryKeys.thread(ALICE)).toEqual(["messages", "alice"]);
    // Coerced, so a numeric id and its string form hit the same entry.
    expect(queryKeys.thread(42)).toEqual(["messages", "42"]);
  });
});
