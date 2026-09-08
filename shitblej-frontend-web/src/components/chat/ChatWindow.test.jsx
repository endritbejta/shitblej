import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ChatWindow from "./ChatWindow";

// The thread data and the offer mutations are covered by their own hooks'
// tests. What matters here is ChatWindow's OWN per-conversation state, which
// Inbox used to reset by remounting the component with a `key` - the remount
// that made every image in the thread re-fade on each switch.
vi.mock("../../hooks/useConversationMessages", () => ({
  useConversationMessages: vi.fn(),
}));
vi.mock("../../hooks/useOfferActions", () => ({
  useOfferActions: vi.fn(() => ({
    busyFor: () => null,
    errorFor: () => null,
    accept: vi.fn(),
    decline: vi.fn(),
    cancel: vi.fn(),
  })),
}));

const { useConversationMessages } = await import("../../hooks/useConversationMessages");

// jsdom implements neither scrollTo nor real layout, and the thread pins itself
// to its newest message on every update. Stubbed rather than worked around in
// the component: the scroll behaviour has its own tests in lib/scroll.test.js.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() {};
}

const USER = { _id: "me", name: "Me" };
const NORA = { id: "nora", name: "Nora Seller", avatar: null };
const ILIR = { id: "ilir", name: "Ilir Seller", avatar: null };

const textMessage = (id, text) => ({
  kind: "text",
  id,
  text,
  sender: "me",
  createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
});

const sendText = vi.fn(() => Promise.resolve(true));

beforeEach(() => {
  vi.clearAllMocks();
  useConversationMessages.mockReturnValue({
    timeline: [textMessage("m1", "hello there")],
    negotiation: { offers: [], latestOffer: null },
    loading: false,
    error: null,
    // Unlocked, so the composer is rendered.
    lock: null,
    clearLock: vi.fn(),
    sendText,
    refresh: vi.fn(),
  });
});

afterEach(cleanup);

const composer = () => screen.queryByPlaceholderText("Write a message…");

describe("switching conversation without a remount", () => {
  it("clears a half-typed message", () => {
    // Inbox no longer keys this component by conversation id, so the draft has
    // to be cleared explicitly. Otherwise text typed to one person follows the
    // reader into the next thread - which would be worse than the flash.
    const { rerender } = render(
      <ChatWindow conversation={NORA} user={USER} onBack={() => {}} />
    );

    fireEvent.change(composer(), { target: { value: "half-written note to Nora" } });
    expect(composer().value).toBe("half-written note to Nora");

    rerender(<ChatWindow conversation={ILIR} user={USER} onBack={() => {}} />);

    expect(composer().value).toBe("");
  });

  it("keeps the draft while the same conversation re-renders", () => {
    const { rerender } = render(
      <ChatWindow conversation={NORA} user={USER} onBack={() => {}} />
    );
    fireEvent.change(composer(), { target: { value: "still typing" } });

    // A new message arriving must not wipe what the reader is writing.
    useConversationMessages.mockReturnValue({
      ...useConversationMessages(),
      timeline: [textMessage("m1", "hello there"), textMessage("m2", "and another")],
    });
    rerender(<ChatWindow conversation={NORA} user={USER} onBack={() => {}} />);

    expect(composer().value).toBe("still typing");
  });

  it("asks the hook for the new partner's thread", () => {
    const { rerender } = render(
      <ChatWindow conversation={NORA} user={USER} onBack={() => {}} />
    );
    rerender(<ChatWindow conversation={ILIR} user={USER} onBack={() => {}} />);

    expect(useConversationMessages).toHaveBeenLastCalledWith({
      user: USER,
      partnerId: "ilir",
    });
  });

  it("reuses the same DOM nodes instead of rebuilding the thread", () => {
    const { rerender, container } = render(
      <ChatWindow conversation={NORA} user={USER} onBack={() => {}} />
    );
    const paneBefore = container.querySelector(".overflow-y-auto");
    paneBefore.dataset.probe = "same-node";

    rerender(<ChatWindow conversation={ILIR} user={USER} onBack={() => {}} />);

    // The point of dropping the `key`: React diffs in place, so nothing in
    // the thread - images included - starts its loading state over.
    const paneAfter = container.querySelector(".overflow-y-auto");
    expect(paneAfter.dataset.probe).toBe("same-node");
  });
});
