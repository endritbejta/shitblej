import { describe, expect, it } from "vitest";
import { canLikelySendText } from "./negotiation";

// Build a thread the way the API returns one: offer messages carry their
// offer populated with its live state.
const offerMessage = (offer) => ({
  _id: `msg-${offer._id}`,
  type: "offer",
  text: "Offer: 20.00 EUR for Thing",
  offer,
  createdAt: new Date().toISOString(),
});

const textMessage = (text) => ({
  _id: `msg-${text}`,
  type: "text",
  text,
  createdAt: new Date().toISOString(),
});

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("canLikelySendText", () => {
  it("is locked on an empty thread", () => {
    expect(canLikelySendText([])).toBe(false);
  });

  it("is locked when nothing has been agreed", () => {
    const thread = [
      offerMessage({ _id: "o1", status: "pending", createdAt: anHourAgo() }),
    ];
    expect(canLikelySendText(thread)).toBe(false);
  });

  // The bug this replaced: the old rule required offer.order, i.e. a
  // COMPLETED checkout, so the whole agreed-but-not-yet-paid window showed a
  // locked composer even though the server accepts messages during it. That
  // window is exactly when the two need to arrange the handover.
  it("is UNLOCKED once an offer is accepted and the checkout window is open", () => {
    const thread = [
      offerMessage({
        _id: "o1",
        status: "accepted",
        checkoutExpiresAt: inAnHour(),
        createdAt: anHourAgo(),
      }),
    ];
    expect(canLikelySendText(thread)).toBe(true);
  });

  it("is locked again once the checkout window has lapsed", () => {
    const thread = [
      offerMessage({
        _id: "o1",
        status: "accepted",
        checkoutExpiresAt: anHourAgo(),
        createdAt: anHourAgo(),
      }),
    ];
    expect(canLikelySendText(thread)).toBe(false);
  });

  it("is unlocked once an order exists, window or not", () => {
    const thread = [
      offerMessage({
        _id: "o1",
        status: "accepted",
        order: "order-1",
        checkoutExpiresAt: anHourAgo(),
        createdAt: anHourAgo(),
      }),
    ];
    expect(canLikelySendText(thread)).toBe(true);
  });

  it("looks at every offer in the thread, not just the newest", () => {
    // A live order from an earlier deal keeps the conversation open even
    // while a newer, unrelated proposal is still pending.
    const thread = [
      offerMessage({
        _id: "o1",
        status: "accepted",
        order: "order-1",
        createdAt: anHourAgo(),
      }),
      offerMessage({ _id: "o2", status: "pending", createdAt: new Date().toISOString() }),
    ];
    expect(canLikelySendText(thread)).toBe(true);
  });

  it("ignores an accepted offer with no checkout window recorded", () => {
    const thread = [
      offerMessage({ _id: "o1", status: "accepted", createdAt: anHourAgo() }),
    ];
    expect(canLikelySendText(thread)).toBe(false);
  });

  it("ignores plain text messages and unpopulated offer refs", () => {
    const thread = [
      textMessage("hello"),
      // Not populated: the API sends the id when populate is skipped.
      { _id: "m2", type: "offer", offer: "64b7f0000000000000000000", text: "Offer" },
    ];
    expect(canLikelySendText(thread)).toBe(false);
  });

  it("accepts an injected clock so the boundary is testable", () => {
    const offer = {
      _id: "o1",
      status: "accepted",
      checkoutExpiresAt: "2026-01-01T12:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const thread = [offerMessage(offer)];

    expect(canLikelySendText(thread, new Date("2026-01-01T11:59:59.000Z"))).toBe(true);
    expect(canLikelySendText(thread, new Date("2026-01-01T12:00:01.000Z"))).toBe(false);
  });
});
