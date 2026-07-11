import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import ChatEmptyState from "../components/chat/ChatEmptyState";
import { getConversations, getMessages, sendMessage } from "../api/messages";
import { getUserById } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { formatConversationTime } from "../utils/dateFormat";
import { cn } from "../utils/cn";

export default function Inbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const pollingRef = useRef(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getConversations();
        const list = (res.data || []).map((c) => ({ ...c, time: formatConversationTime(c.time) }));
        if (!cancelled) setConversations(list);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // "Contact seller" deep link (?userId=)
  useEffect(() => {
    const targetUserId = new URLSearchParams(location.search).get("userId");
    if (!targetUserId || !user) return;
    if (targetUserId === user._id) {
      navigate("/inbox", { replace: true });
      return;
    }
    (async () => {
      try {
        const target = await getUserById(targetUserId);
        const conv = {
          id: target._id,
          name: target.name,
          avatar: target.image,
          lastMessage: "",
          time: "",
        };
        setSelected(conv);
        setConversations((prev) => (prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]));
      } catch {
        /* ignore — the user can still pick from the list */
      }
    })();
  }, [location.search, user, navigate]);

  // Load + poll messages for the selected conversation
  useEffect(() => {
    if (!selected || !user) return;
    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const res = await getMessages(selected.id, user._id);
        const list = (res.data || []).map((m) => ({
          id: m._id,
          text: m.text,
          isOwn: m.sender === user._id,
          createdAt: m.createdAt,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        if (!cancelled) setMessages(list);
      } catch {
        /* keep current messages on transient errors */
      }
    };

    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 10000);
    return () => {
      cancelled = true;
      clearInterval(pollingRef.current);
    };
  }, [selected, user]);

  const handleSend = async (text) => {
    if (!selected || !user) return;
    const optimistic = {
      id: `tmp-${Date.now()}`,
      text,
      isOwn: true,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await sendMessage(user._id, selected.id, text);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[540px] max-w-container overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
      {/* Sidebar */}
      <div className={cn("h-full w-full shrink-0 border-gray-100 dark:border-zinc-800 md:w-[340px] md:border-r lg:w-[380px]", selected && "hidden md:block")}>
        <ChatSidebar
          conversations={conversations}
          selectedId={selected?.id}
          onSelect={setSelected}
          loading={loadingConversations}
        />
      </div>

      {/* Chat */}
      <div className={cn("h-full flex-1", !selected && "hidden md:block")}>
        {selected ? (
          <ChatWindow
            conversation={selected}
            messages={messages}
            onSendMessage={handleSend}
            onBack={() => setSelected(null)}
          />
        ) : (
          <ChatEmptyState />
        )}
      </div>
    </div>
  );
}
