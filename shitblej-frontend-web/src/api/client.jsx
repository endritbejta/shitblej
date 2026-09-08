import axios from "axios";
import { API_BASE_URL } from "../lib/config";
import { clearSession, getToken, notifyUnauthorized } from "../lib/authToken";

const client = axios.create({ baseURL: API_BASE_URL });

// Auth token and Content-Type interceptor
client.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type to JSON if not FormData.
    // FormData sets its own Content-Type with the multipart boundary.
    if (!(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

// A 401 on the login/register calls is the normal answer to bad credentials,
// not an expired session - those must reach the form so it can show the error.
const isCredentialCheck = (url = "") =>
    url.includes("/users/login") || url.includes("/users/register");

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

        // The session is gone: the token expired, was revoked, or the account
        // was deleted. Previously nothing handled this, so the app kept its
        // stale user and every request failed silently until a manual reload.
        // Drop the token and let AuthContext react (ProtectedRoute then sends
        // the user to /login).
        if (error.response?.status === 401 && !isCredentialCheck(error.config?.url)) {
            clearSession();
            notifyUnauthorized();
        }

        return Promise.reject(error);
    }
);

export default client;
