import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { getConversations, getMessages, sendMessage } from '../api/messages';
import { getUserById } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { formatConversationTime } from '../utils/dateFormat';

export default function Inbox() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    
    // State
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Refs for polling
    const pollingInterval = useRef(null);

    // 0. Fetch all conversations on mount
    useEffect(() => {
        if (!user) return;

        async function fetchConversations() {
            try {
                console.log("Fetching conversations...");
                const response = await getConversations();
                console.log("Conversations fetched:", response.data);
                
                // Format the time for each conversation
                const formattedConversations = (response.data || []).map(conv => ({
                    ...conv,
                    time: formatConversationTime(conv.time)
                }));
                
                setConversations(formattedConversations);
            } catch (err) {
                console.error("Failed to fetch conversations:", err);
            }
        }

        fetchConversations();
    }, [user]);

    // 1. Handle "Contact Seller" flow (userId from query param)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const targetUserId = params.get('userId');

        if (targetUserId && user) {
            if (targetUserId === user._id) {
                // Prevent chatting with self
                navigate('/inbox', { replace: true });
                return;
            }

            async function initChat() {
                try {
                    setLoading(true);
                    console.log("Fetching user details for:", targetUserId);
                    
                    // Fetch target user details
                    const targetUser = await getUserById(targetUserId);
                    console.log("Target user fetched:", targetUser);
                    
                    // Set as selected conversation
                    const newConv = {
                        id: targetUser._id,
                        name: targetUser.name,
                        avatar: targetUser.image || "https://via.placeholder.com/150",
                        lastMessage: "",
                        time: ""
                    };
                    
                    console.log("Setting selected conversation:", newConv);
                    setSelectedConversation(newConv);
                    
                    // Add to conversations list if not present
                    setConversations(prev => {
                        if (!prev.find(c => c.id === newConv.id)) {
                            return [newConv, ...prev];
                        }
                        return prev;
                    });
                } catch (err) {
                    console.error("Failed to init chat:", err);
                    alert("Failed to load chat. Please try again.");
                } finally {
                    setLoading(false);
                }
            }
            
            initChat();
        }
    }, [location.search, user, navigate]);

    // 2. Fetch messages when conversation selected
    useEffect(() => {
        if (!selectedConversation || !user) return;

        async function fetchMessages() {
            try {
                // Pass currentUserId as query param as requested by backend
                const response = await getMessages(selectedConversation.id, user._id);
                
                // Transform backend messages to frontend format if needed
                // Backend: { sender, receiver, text, createdAt }
                // Frontend expects: { id, text, isOwn, time }
                const formattedMessages = (response.data || []).map(msg => ({
                    id: msg._id,
                    text: msg.text,
                    isOwn: msg.sender === user._id,
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                
                setMessages(formattedMessages);
            } catch (err) {
                console.error("Failed to fetch messages:", err);
            }
        }

        fetchMessages();

        // Start polling
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        pollingInterval.current = setInterval(fetchMessages, 10000); // Poll every 3s

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, [selectedConversation, user]);

    const handleSendMessage = async (text) => {
        if (!selectedConversation || !user) return;

        try {
            // Optimistic update
            const tempId = Date.now();
            const newMessage = {
                id: tempId,
                text,
                isOwn: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newMessage]);

            // Send to API
            await sendMessage(user._id, selectedConversation.id, text);
            
            // Refresh messages to get real ID and server timestamp
            // (Polling will handle this, but we can trigger one immediately)
        } catch (err) {
            console.error("Failed to send message:", err);
            // Ideally show error and remove optimistic message
            alert("Failed to send message");
        }
    };

    if (!user) {
        return (
            <div className="h-[calc(100vh-100px)] flex items-center justify-center">
                <p>Please log in to view messages.</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden flex shadow-sm relative">
            {/* Sidebar: Hidden on mobile if conversation selected */}
            <div className={`w-full md:w-1/3 h-full ${selectedConversation ? 'hidden md:block' : 'block'}`}>
                <ChatSidebar 
                    conversations={conversations} 
                    selectedId={selectedConversation?.id} 
                    onSelect={setSelectedConversation} 
                />
            </div>

            {/* Chat Window: Hidden on mobile if NO conversation selected */}
            <div className={`w-full md:w-2/3 h-full ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                <ChatWindow 
                    conversation={selectedConversation} 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    onBack={() => setSelectedConversation(null)}
                />
            </div>
        </div>
    );
}