// Pure derivations over backend data. No business rules live here — only
// presentation-shaping of what the API returns. The server decides who may
// act; we merely mirror its data (status, proposedBy, party ids) to know
// which controls to draw, and it re-validates every action anyway.

const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

/** Offer lifecycle labels/tones for display. Mirrors backend status strings. */
export const OFFER_STATUS_META = Object.freeze({
  pending: { label: "Awaiting response", tone: "pending" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  countered: { label: "Countered", tone: "muted" },
  cancelled: { label: "Withdrawn", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
});

/** Which side of the table is this user on for a given offer? */
export function partyOf(offer, userId) {
  if (idOf(offer.buyer) === String(userId)) return "buyer";
  if (idOf(offer.seller) === String(userId)) return "seller";
  return null;
}

/** The party allowed to respond is always the one who did NOT propose. */
export function recipientOf(offer) {
  return offer.proposedBy === "buyer" ? "seller" : "buyer";
}

/**
 * Actions the current user can take on an offer, derived purely from the
 * offer document. The backend enforces the same rules server-side.
 */
export function actionsFor(offer, userId) {
  const party = partyOf(offer, userId);
  if (!party || offer.status !== "pending") return [];
  if (party === recipientOf(offer)) return ["accept", "counter", "decline"];
  if (party === offer.proposedBy) return ["cancel"];
  return [];
}

/**
 * Turn the raw message thread into timeline items.
 *
 * The backend posts one chat message per negotiation step; every message for
 * a given offer populates to that offer's CURRENT state. We render the first
 * message per offer as a full card (live state) and subsequent messages for
 * the same offer as compact system events, using the backend's own fallback
 * text — nothing is fabricated client-side.
 */
export function buildTimeline(messages) {
  const seenOffers = new Set();

  return messages.map((msg) => {
    const base = { id: msg._id, createdAt: msg.createdAt, sender: msg.sender };

    if (msg.type === "offer") {
      const populated = msg.offer && typeof msg.offer === "object";
      const offerId = populated ? idOf(msg.offer) : msg.offer && String(msg.offer);

      if (populated && !seenOffers.has(offerId)) {
        seenOffers.add(offerId);
        return { ...base, kind: "offer", offer: msg.offer };
      }
      // Later lifecycle step (accept/decline/cancel) or unpopulated payload.
      return {
        ...base,
        kind: "event",
        text: msg.text,
        offer: populated ? msg.offer : null,
      };
    }

    return { ...base, kind: "text", text: msg.text };
  });
}

/**
 * Summary of the negotiation embedded in a thread — used for hints (banner
 * copy, composer emphasis), never for permission decisions.
 */
export function deriveNegotiation(messages) {
  const offersById = new Map();
  for (const msg of messages) {
    if (msg.type === "offer" && msg.offer && typeof msg.offer === "object") {
      offersById.set(idOf(msg.offer), msg.offer);
    }
  }
  const offers = [...offersById.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const latestOffer = offers[offers.length - 1] || null;
  return {
    offers,
    latestOffer,
    hasPending: latestOffer?.status === "pending",
    acceptedOffer: offers.find((o) => o.status === "accepted") || null,
  };
}
