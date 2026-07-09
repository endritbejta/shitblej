import client from "./client";

/**
 * Fetch products from API with optional filters
 * @param {Object} options - Filter/sort/pagination options
 * @param {string} options.category - Category slug, e.g., "women"
 * @param {number} options.limit - Max number of results
 * @param {number} options.page - Pagination page
 * @param {string} options.sort - Sort field, e.g., "price,-createdAt"
 * @param {number} options.priceMin - Minimum price
 * @param {number} options.priceMax - Maximum price
 * @param {string} options.name - Search by name
 */
export async function getProducts(options = {}) {
    const params = {};

    if (options.category) params.category = options.category;
    if (options.limit) params.limit = options.limit;
    if (options.page) params.page = options.page;
    if (options.sort) params.sort = options.sort;
    if (options.name) params.name = options.name;
    if (options.priceMin) params["price[gte]"] = options.priceMin;
    if (options.priceMax) params["price[lte]"] = options.priceMax;
    if (options.user) params.user = options.user;

    console.log("Fetching products with params:", params);

    const { data } = await client.get("/products", { params });
    console.log("Fetched products:", data.data);
    return data.data || [];
}


// Fetch one product by ID
export async function getProductById(id) {
    const { data } = await client.get(`/products/${id}`);
    return data;
}

// Create a new product
export async function createProduct(payload) {
    const { data } = await client.post("/products", payload);
    return data;
}

// 🔍 Search products by keyword
export async function searchProducts(query) {
    if (!query || query.trim().length < 2) return [];
    const { data } = await client.get("/products/search", {
        params: { q: query },
    });

    // backend returns { success, count, data: [...] }
    // so extract the data array for the frontend
    return data.data || [];
}