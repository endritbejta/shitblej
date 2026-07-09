import axios from "axios";

const client = axios.create({
    baseURL: "http://localhost:3000/api/v1", // adjust base path
});

// Auth token and Content-Type interceptor
client.interceptors.request.use((config) => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    
    if (token && token !== "undefined" && token !== "null") {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("[API Request] Attaching token:", token.substring(0, 10) + "...");
    } else {
        console.warn("[API Request] No token found in storage!");
    }
    
    // Only set Content-Type to JSON if not FormData
    // FormData will set its own Content-Type with boundary
    if (!(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json";
    }
    
    return config;
});

// Log responses and errors
client.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        if (error.response) {
            // Server responded with a status code outside 2xx
            console.error(`[API Error] ${error.response.status} ${error.config.url}`, error.response.data);
        } else if (error.request) {
            // Request was made but no response received (Network Error/CORS)
            console.error("[API Error] No response received (Network Error or CORS):", error.request);
        } else {
            console.error("[API Error] Request setup failed:", error.message);
        }
        return Promise.reject(error);
    }
);

export default client;