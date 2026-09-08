import client from "./client";

/**
 * Offers (structured negotiation) API — /api/v1/offers.
 * All amounts are integer cents; all rules (bounds, suggestions, who may act)
 * come from the backend. This module is the only place offer endpoints are
 * called — components go through hooks, never axios.
 */

// Negotiation envelope for a listing: asking price, [min,max] bounds,
// suggested amounts, and whether this user may open a negotiation.
export async function getOfferOptions(productId) {
    const { data } = await client.get("/offers/options", {
        params: { product: productId },
    });
    return data.data;
}

// Start a negotiation. type: "offer" (with amountCents) or "buy_now"
// (server uses the asking price; the seller still has to accept).
export async function makeOffer({ product, type = "offer", amountCents, message }) {
    const { data } = await client.post("/offers", {
        product,
        type,
        ...(type === "offer" ? { amountCents } : {}),
        ...(message ? { message } : {}),
    });
    return data.data;
}

export async function acceptOffer(offerId) {
    const { data } = await client.post(`/offers/${offerId}/accept`, {});
    return data.data;
}

export async function declineOffer(offerId) {
    const { data } = await client.post(`/offers/${offerId}/decline`, {});
    return data.data;
}

export async function counterOffer(offerId, { amountCents, message }) {
    const { data } = await client.post(`/offers/${offerId}/counter`, {
        amountCents,
        ...(message ? { message } : {}),
    });
    return data.data;
}

export async function cancelOffer(offerId) {
    const { data } = await client.post(`/offers/${offerId}/cancel`, {});
    return data.data;
}

