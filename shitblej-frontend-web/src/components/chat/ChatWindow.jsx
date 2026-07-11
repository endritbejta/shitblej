import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { Send, ArrowLeft, Paperclip, CheckCheck } from "lucide-react";
import SmartImage from "../ui/SmartImage";
import { cn } from "../../utils/cn";

function dayLabel(date) {
  const d = new Date(date);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(now) - startOf(d)) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Group consecutive messages by calendar day for date separators. */
function groupByDay(messages) {
  const groups = [];
  messages.forEach((m) => {
    const key = m.createdAt ? new Date(m.createdAt).toDateString() : "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, date: m.createdAt, items: [m] });
  });
  return groups;
}

/** Animated three-dot typing indicator (design-ready — pass `typing`). */
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ conversation, messages, onSendMessage, onBack, typing = false }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (messages.length > prevCount.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCount.current = messages.length;
  }, [messages, typing]);

  const groups = useMemo(() => groupByDay(messages), [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  };

  return (
    <div className="flex h-full w-full flex-col bg-gray-50 dark:bg-black">
      {/* Sticky header */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <SmartImage
          src={conversation.avatar}
          alt={conversation.name}
          wrapperClassName="h-10 w-10 shrink-0 rounded-full"
          className="h-full w-full rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">{conversation.name}</h3>
          {conversation.product ? (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              About {conversation.product.name}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Marketplace member</p>
          )}
        </div>

        {/* Product preview slot (design-ready) */}
        {conversation.product && (
          <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 pr-3 dark:border-zinc-800 dark:bg-zinc-800/60 sm:flex">
            <SmartImage
              src={conversation.product.images?.[0]}
              alt={conversation.product.name}
              wrapperClassName="h-9 w-9 rounded-lg"
              className="h-full w-full rounded-lg object-cover"
            />
            <span className="text-sm font-bold text-brand-600 dark:text-brand-500">
              ${conversation.product.price}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && !typing && (
          <p className="pt-8 text-center text-sm text-gray-400">
            No messages yet — say hello.
          </p>
        )}

        {groups.map((group) => (
          <Fragment key={group.key || group.items[0]?.id}>
            {group.date && (
              <div className="flex justify-center">
                <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
                  {dayLabel(group.date)}
                </span>
              </div>
            )}
            {group.items.map((msg, i) => {
              const prev = group.items[i - 1];
              const grouped = prev && prev.isOwn === msg.isOwn; // tighten consecutive bubbles
              return (
                <div
                  key={msg.id}
                  className={cn("flex", msg.isOwn ? "justify-end" : "justify-start", grouped ? "mt-1" : "mt-4")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]",
                      msg.isOwn
                        ? "bg-brand-500 text-white"
                        : "border border-gray-200 bg-white text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white",
                      msg.isOwn ? (grouped ? "rounded-br-md" : "rounded-br-md") : grouped ? "rounded-bl-md" : "rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                    <span
                      className={cn(
                        "mt-1 flex items-center justify-end gap-1 text-[10px]",
                        msg.isOwn ? "text-white/70" : "text-gray-400"
                      )}
                    >
                      {msg.time}
                      {/* Read receipt — design-ready */}
                      {msg.isOwn && <CheckCheck className={cn("h-3 w-3", msg.read ? "text-white" : "text-white/60")} />}
                    </span>
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}

        {typing && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          aria-label="Add attachment"
          title="Attachments coming soon"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
        >
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          className="h-11 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder-gray-400 focus-visible:ring-0 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-white"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500"
        >
          <Send className="h-[18px] w-[18px]" />
        </button>
      </form>
    </div>
  );
}
