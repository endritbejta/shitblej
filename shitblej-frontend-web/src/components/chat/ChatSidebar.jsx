import { useState, useMemo } from "react";
import { Search, MessageSquare } from "lucide-react";
import SmartImage from "../ui/SmartImage";
import { cn } from "../../utils/cn";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/2 rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

/**
 * Conversation list. Fixed, scannable width; search, polished rows with
 * unread + active states, skeleton loading and an empty state.
 */
export default function ChatSidebar({ conversations, selectedId, onSelect, loading }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 pb-3 pt-4 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Messages</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus-visible:ring-0 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="no-scrollbar flex-1 overflow-y-auto py-1.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-800">
              <MessageSquare className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {query ? "No matches" : "No messages yet"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {query ? "Try a different name." : "Reach out to a seller from any listing to start a chat."}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const active = selectedId === conv.id;
            const unread = conv.unread > 0;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                aria-current={active}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  "mx-1.5 w-[calc(100%-0.75rem)] rounded-xl",
                  active
                    ? "bg-gray-100 dark:bg-zinc-800"
                    : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="relative shrink-0">
                  <SmartImage
                    src={conv.avatar}
                    alt={conv.name}
                    wrapperClassName="h-12 w-12 rounded-full"
                    className="h-full w-full rounded-full object-cover"
                  />
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-brand-500 dark:border-zinc-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className={cn(
                        "truncate text-sm text-gray-900 dark:text-white",
                        unread ? "font-bold" : "font-semibold"
                      )}
                    >
                      {conv.name}
                    </h3>
                    {conv.time && (
                      <span className={cn("shrink-0 text-xs", unread ? "font-semibold text-brand-600 dark:text-brand-400" : "text-gray-400")}>
                        {conv.time}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", unread ? "font-medium text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400")}>
                      {conv.lastMessage || "Start the conversation"}
                    </p>
                    {unread && (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                        {conv.unread > 9 ? "9+" : conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
