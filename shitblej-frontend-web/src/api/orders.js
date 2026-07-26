import client from "./client";

/**
 * Turn an accepted offer into an order. Price and product are resolved by the
 * backend from the agreement; the buyer only supplies delivery details.
 */
export async function checkoutOffer({ offer, shippingAddress, note }) {
  const { data } = await client.post("/orders", {
    offer,
    shippingAddress,
    ...(note ? { note } : {}),
  });
  return data.data;
}
