// src/api/auth.js
import client from "./client";


export async function login(email, password) {

    const { data } = await client.post("/users/login", { email, password });
    return data;
}

export async function signup(username, email, password) {
    // ... mock mode check ...
    const { data } = await client.post("/users/register", { 
        name: username, // Backend expects 'name', not 'username'
        email, 
        password 
    });
    return data;
}

export async function getCurrentUser() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return null;

    try {
        // Decode token payload (middle part)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const { id } = JSON.parse(jsonPayload);
        return await getUserById(id);
    } catch (error) {
        console.error("Failed to fetch current user:", error);
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