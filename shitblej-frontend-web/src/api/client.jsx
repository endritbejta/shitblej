import axios from "axios";

// In dev, go through the Vite proxy (/api) to sidestep CORS; in production,
// talk to the hosted API directly.
const client = axios.create({
    baseURL: import.meta.env.DEV
        ? "/api/v1"
        : "https://shitblej.onrender.com/api/v1",
});

// Auth token and Content-Type interceptor
client.interceptors.request.use((config) => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type to JSON if not FormData.
    // FormData sets its own Content-Type with the multipart boundary.
    if (!(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

// Surface real errors, stay quiet otherwise.
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (import.meta.env.DEV) {
            const url = error.config?.url;
            if (error.response) {
                console.error(`[API] ${error.response.status} ${url}`, error.response.data);
            } else {
                console.error("[API] Network error", url, error.message);
            }
        }
        return Promise.reject(error);
    }
);

export default client;