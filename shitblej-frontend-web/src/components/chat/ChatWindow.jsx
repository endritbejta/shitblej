import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const ChatWindow = ({ conversation, messages, onSendMessage, onBack }) => {
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);
    const prevMessageCountRef = useRef(0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Only scroll if new messages were added (count increased)
        if (messages.length > prevMessageCountRef.current) {
            scrollToBottom();
        }
        prevMessageCountRef.current = messages.length;
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage("");
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black text-gray-500">
                <p>Select a conversation to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-black w-full">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-3">
                <button 
                    onClick={onBack}
                    className="md:hidden mr-2 text-gray-600 dark:text-gray-300 hover:text-green-500"
                >
                    ← Back
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                    <img 
                        src={conversation.avatar || "https://via.placeholder.com/150"} 
                        alt={conversation.name} 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{conversation.name}</h3>
                    <p className="text-xs text-green-500">Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                msg.isOwn 
                                    ? 'bg-green-500 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-zinc-700'
                            }`}
                        >
                            <p>{msg.text}</p>
                            <span className={`text-[10px] block text-right mt-1 ${msg.isOwn ? 'text-green-100' : 'text-gray-400'}`}>
                                {msg.time}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 border-0 rounded-full px-4 py-2 dark:text-white"
                />
                <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
