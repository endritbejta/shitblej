import client from "./client";
import { getToken } from "../lib/authToken";


export async function login(email, password) {

    const { data } = await client.post("/users/login", { email, password });
    return data;
}

export async function signup(username, email, password) {
    const { data } = await client.post("/users/register", { 
        name: username, // Backend expects 'name', not 'username'
        email, 
        password 
    });
    return data;
}

/**
 * The signed-in user's own profile.
 *
 * Asks the API who it is talking to. This used to decode the JWT payload by
 * hand - base64url, atob, percent-encoding - purely to recover its own id
 * before fetching /users/:id. GET /users/me was added to the backend to
 * replace exactly that (its own comment says so), and returns the identical
 * projection: getUserById treats a self-request as `isSelf` and serves the
 * owner view either way.
 *
 * The no-token short-circuit stays, so a signed-out caller still gets null
 * instead of provoking a 401 that would end the session.
 */
export async function getCurrentUser() {
    if (!getToken()) return null;

    try {
        const { data } = await client.get("/users/me");
        return data.data;
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error("Failed to fetch current user:", error);
        }
        throw error;
    }
}

export async function getUserById(userId) {
    const { data } = await client.get(`/users/${userId}`);
    return data.data; // Backend returns { success: true, data: user }
}

export async function updateUserProfile(userId, formData) {
    const { data } = await client.put(`/users/${userId}`, formData);
    return data.data; // Backend returns { success: true, data: updatedUser }
}