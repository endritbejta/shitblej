import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import ChatEmptyState from "../components/chat/ChatEmptyState";
import ErrorBoundary from "../components/ErrorBoundary";
import { getConversations } from "../api/messages";
import { getUserById } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { queryKeys } from "../lib/queryClient";
import { formatConversationTime } from "../utils/dateFormat";
import { cn } from "../utils/cn";

export default function Inbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

  // Cached, so returning to the inbox shows the list immediately and
  // revalidates behind it instead of starting from empty.
  const { data: rawConversations = [], isPending } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: async () => (await getConversations()).data || [],
    enabled: Boolean(user),
  });

  // Timestamps are formatted for display here rather than in the cache, so the
  // cached copy stays the server's own data and relative times do not freeze
  // at whatever they said when the response landed.
  const conversations = useMemo(
    () => rawConversations.map((c) => ({ ...c, time: formatConversationTime(c.time) })),
    [rawConversations]
  );

  const loadingConversations = Boolean(user) && isPending;

  const refreshConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
  }, [queryClient]);

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
        // Into the cache, not local state, so the row survives navigating
        // away and back while the deep link is still in the URL.
        queryClient.setQueryData(queryKeys.conversations, (prev = []) =>
          prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
        );
      } catch {
        /* the user can still pick from the list */
      }
    })();
  }, [location.search, user, navigate, queryClient]);

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
