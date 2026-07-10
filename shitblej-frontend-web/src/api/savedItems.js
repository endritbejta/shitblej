import client from "./client";

/**
 * Saved Items (wishlist) API — talks to /api/v1/saved-items.
 * The axios client attaches the auth token automatically, so these are only
 * meaningful for authenticated users.
 */

// Fetch the current user's saved items. Each record populates its `product`,
// which is what the UI actually renders.
export async function getSavedItems() {
    const { data } = await client.get("/saved-items", { params: { limit: 100 } });
    return data.data || [];
}

// Save a product. Returns the created saved item (with populated product).
export async function addSavedItem(productId) {
    const { data } = await client.post("/saved-items", { product: productId });
    return data.data;
}

// Remove a product from saved items (toggle-friendly: keyed by product id).
export async function removeSavedItemByProduct(productId) {
    const { data } = await client.delete(`/saved-items/product/${productId}`);
    return data;
}
