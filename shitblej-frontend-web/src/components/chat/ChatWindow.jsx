import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { Send, ArrowLeft, Lock, Handshake } from "lucide-react";
import SmartImage from "../ui/SmartImage";
import OfferCard from "../offers/OfferCard";
import OfferSystemEvent from "../offers/OfferSystemEvent";
import OfferResponseDialog from "../offers/OfferResponseDialog";
import OfferPrice from "../offers/OfferPrice";
import CheckoutDialog from "../offers/CheckoutDialog";
import { useConversationMessages } from "../../hooks/useConversationMessages";
import { useOfferActions } from "../../hooks/useOfferActions";
import { actionsFor } from "../../lib/negotiation";
import { cn } from "../../utils/cn";

function dayLabel(date) {
  const d = new Date(date);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(now) - startOf(d)) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function groupByDay(items) {
  const groups = [];
  items.forEach((item) => {
    const key = item.createdAt ? new Date(item.createdAt).toDateString() : "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date: item.createdAt, items: [item] });
  });
  return groups;
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
          <div className="skeleton h-16 w-56 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyNegotiationState({ partnerName }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <Handshake className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-gray-900 dark:text-white">
        Start negotiating with {partnerName}
      </p>
      <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
        Conversations begin with structured offers. Messaging opens only after
        checkout creates an accepted order.
      </p>
    </div>
  );
}

/**
 * The conversation as a negotiation timeline: offer cards, system events and
 * (policy permitting) text messages. All state comes from the thread + socket
 * via useConversationMessages; all rules from the backend.
 */
export default function ChatWindow({ conversation, user, onBack, typing = false }) {
  const [text, setText] = useState("");
  const [countering, setCountering] = useState(null);
  const [checkingOut, setCheckingOut] = useState(null);
  const endRef = useRef(null);
  const prevCount = useRef(0);

  const {
    timeline,
    negotiation,
    loading,
    error,
    lock,
    clearLock,
    sendText,
    refresh,
  } = useConversationMessages({ user, partnerId: conversation.id });

  const offerActions = useOfferActions({
    onSettled: () => {
      refresh();
    },
  });

  useEffect(() => {
    if (timeline.length > prevCount.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCount.current = timeline.length;
  }, [timeline, typing]);

  const groups = useMemo(() => groupByDay(timeline), [timeline]);
  const productContext = negotiation.latestOffer;

  const submitText = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendText(text.trim());
    setText("");
  };

  const submitCounter = async (amountCents, message) => {
    try {
      await offerActions.counter(countering._id, { amountCents, message });
      setCountering(null);
    } catch {
      /* error stays visible inside the dialog */
    }
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
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">
            {conversation.name}
          </h3>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {productContext ? `About ${productContext.productName}` : "Marketplace member"}
          </p>
        </div>

        {/* Product preview from the live negotiation */}
        {productContext && (
          <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 pr-3 dark:border-zinc-800 dark:bg-zinc-800/60 sm:flex">
            <SmartImage
              src={productContext.productImage}
              alt={productContext.productName}
              wrapperClassName="h-9 w-9 rounded-lg"
              className="h-full w-full rounded-lg object-cover"
            />
            <OfferPrice cents={productContext.amountCents} currency={productContext.currency} size="sm" />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {loading ? (
          <ThreadSkeleton />
        ) : timeline.length === 0 ? (
          <EmptyNegotiationState partnerName={conversation.name} />
        ) : (
          groups.map((group) => (
            <Fragment key={group.key || group.items[0]?.id}>
              {group.date && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
                    {dayLabel(group.date)}
                  </span>
                </div>
              )}
              {group.items.map((item) => {
                if (item.kind === "offer") {
                  const isOwn =
                    String(item.offer[item.offer.proposedBy]?._id || item.offer[item.offer.proposedBy]) ===
                    String(user._id);
                  const canCheckout =
                    item.offer.status === "accepted" &&
                    String(item.offer.buyer?._id || item.offer.buyer) ===
                      String(user._id) &&
                    !item.offer.order;
                  return (
                    <OfferCard
                      key={item.id}
                      offer={item.offer}
                      isOwn={isOwn}
                      partnerName={conversation.name}
                      actions={actionsFor(item.offer, user._id)}
                      busyAction={offerActions.busyFor(item.offer._id)}
                      error={offerActions.errorFor(item.offer._id)}
                      onAccept={() => offerActions.accept(item.offer._id).catch(() => {})}
                      onDecline={() => offerActions.decline(item.offer._id).catch(() => {})}
                      onCancel={() => offerActions.cancel(item.offer._id).catch(() => {})}
                      onCounter={() => setCountering(item.offer)}
                      canCheckout={canCheckout}
                      onCheckout={() => setCheckingOut(item.offer)}
                    />
                  );
                }
                if (item.kind === "event") {
                  return <OfferSystemEvent key={item.id} text={item.text} offer={item.offer} />;
                }
                const isOwn = String(item.sender?._id || item.sender) === String(user._id);
                return (
                  <div key={item.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]",
                        isOwn
                          ? "rounded-br-md bg-brand-500 text-white"
                          : "rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{item.text}</p>
                      <span className={cn("mt-1 block text-right text-[10px]", isOwn ? "text-white/70" : "text-gray-400")}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))
        )}
        {error && !loading && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer — or the policy banner when the backend locked messaging */}
      {lock ? (
        <div className="flex items-start gap-2.5 border-t border-gray-100 bg-white px-4 py-3.5 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>{lock.message}</span>
        </div>
      ) : (
        <form
          onSubmit={submitText}
          className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
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
      )}

      {/* Counter dialog */}
      {countering && (
        <OfferResponseDialog
          offer={countering}
          busy={offerActions.busyFor(countering._id) === "counter"}
          serverError={offerActions.errorFor(countering._id)}
          onSubmit={submitCounter}
          onClose={() => setCountering(null)}
        />
      )}

      {checkingOut && (
        <CheckoutDialog
          offer={checkingOut}
          onClose={() => setCheckingOut(null)}
          onSuccess={() => {
            setCheckingOut(null);
            clearLock();
            refresh();
          }}
        />
      )}
    </div>
  );
}
