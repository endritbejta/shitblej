import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import ChatEmptyState from "../components/chat/ChatEmptyState";
import ErrorBoundary from "../components/ErrorBoundary";
import { getConversations } from "../api/messages";
import { getUserById } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { formatConversationTime } from "../utils/dateFormat";
import { cn } from "../utils/cn";

export default function Inbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selected, setSelected] = useState(null);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getConversations();
      setConversations(
        (res.data || []).map((c) => ({ ...c, time: formatConversationTime(c.time) }))
      );
    } catch {
      /* keep the current list on transient errors */
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await refreshConversations();
      if (!cancelled) setLoadingConversations(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshConversations]);

  // Keep the list fresh: every persisted message (text or offer) is relayed
  // over the socket, so new negotiations appear without a reload.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const onMessage = () => refreshConversations();
    socket.on("message", onMessage);
    return () => socket.off("message", onMessage);
  }, [user, refreshConversations]);

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
        const conv = { id: target._id, name: target.name, avatar: target.image, lastMessage: "", time: "" };
        setSelected(conv);
        setConversations((prev) => (prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]));
      } catch {
        /* the user can still pick from the list */
      }
    })();
  }, [location.search, user, navigate]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[540px] max-w-container overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
      {/* Sidebar */}
      <div
        className={cn(
          "h-full w-full shrink-0 border-gray-100 dark:border-zinc-800 md:w-[340px] md:border-r lg:w-[380px]",
          selected && "hidden md:block"
        )}
      >
        <ChatSidebar
          conversations={conversations}
          selectedId={selected?.id}
          onSelect={setSelected}
          loading={loadingConversations}
        />
      </div>

      {/* Negotiation thread */}
      <div className={cn("h-full flex-1", !selected && "hidden md:block")}>
        <ErrorBoundary>
          {selected ? (
            <ChatWindow
              key={selected.id}
              conversation={selected}
              user={user}
              onBack={() => setSelected(null)}
            />
          ) : (
            <ChatEmptyState />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
