// A missing or unparseable timestamp renders as nothing rather than as the
// string "Invalid Date", which is what `new Date("").toLocaleDateString()`
// produces and what a conversation with no messages yet would have shown.
const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

// Format date for conversation list (Today 3:45 PM, Yesterday, 28 Nov, etc.)
export function formatConversationTime(dateString) {
    const date = new Date(dateString);
    if (!isValidDate(date)) return "";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Today - show time
    if (messageDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    // Yesterday
    if (messageDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }
    
    // This year - show day and month
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
    
    // Different year - show day, month, year
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Format date for individual messages in chat (3:45 PM)
export function formatMessageTime(dateString) {
    const date = new Date(dateString);
    if (!isValidDate(date)) return "";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
