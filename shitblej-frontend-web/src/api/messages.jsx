// src/api/messages.js
import client from "./client";

// Get all conversations for the current user
export async function getConversations() {
    const { data } = await client.get("/messages/conversations");
    return data;
}

// Get messages between current user and another user
export async function getMessages(otherUserId, currentUserId) {
    // Backend expects currentUserId in query params for now
    const { data } = await client.get(`/messages/${otherUserId}`, {
        params: { currentUserId }
    });
    return data;
}

// Send a message
export async function sendMessage(senderId, receiverId, text) {
    const { data } = await client.post("/messages", {
        sender: senderId,
        receiver: receiverId,
        text
    });
    return data;
}