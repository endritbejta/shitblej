// src/api/messages.js
import client from "./client";

// Get all conversations for the current user
export async function getConversations() {
    const { data } = await client.get("/messages/conversations");
    return data;
}

// Get the message thread with another user. The current user is derived from
// the auth token server-side; offer messages arrive with their offer populated.
export async function getMessages(otherUserId) {
    const { data } = await client.get(`/messages/${otherUserId}`);
    return data;
}

// Send a text message. The sender is the authenticated user (token-derived).
// Note: the backend messaging policy may reject this with
// 403 { code: "negotiation_required" } until an accepted order exists.
export async function sendMessage(receiverId, text) {
    const { data } = await client.post("/messages", {
        receiver: receiverId,
        text,
    });
    return data;
}
