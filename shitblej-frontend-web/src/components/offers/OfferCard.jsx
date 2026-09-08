import { memo } from "react";
import { Tag, Clock3 } from "lucide-react";
import OfferPrice from "./OfferPrice";
import OfferStatusBadge from "./OfferStatusBadge";
import OfferActions from "./OfferActions";
import SmartImage from "../ui/SmartImage";
import Button from "../ui/Button";
import { formatCents } from "../../lib/money";
import { cn } from "../../utils/cn";
import { WIDTHS } from "../../lib/imageUrl";

/** Display-only countdown, from backend timestamps. */
function timeLeft(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(ms / 60000))}m`;
}

/**
 * A single proposal in the negotiation timeline. Everything rendered comes
 * from the offer document; available actions are derived by the caller.
 */
function OfferCardComponent({
  offer,
  isOwn,
  partnerName,
  actions,
  busyAction,
  error,
  onAccept,
  onDecline,
  onCancel,
  onCounter,
  canCheckout = false,
  onCheckout,
}) {
  const isCounter = !!offer.previousOffer;
  const isBuyNow = offer.type === "buy_now";
  const title = isBuyNow ? "Buy now request" : isCounter ? "Counter offer" : "Offer";
  const proposerName = isOwn
    ? "You"
    : offer[offer.proposedBy]?.name || partnerName || "the other party";
  const pending = offer.status === "pending";
  const expiresIn = pending && offer.expiresAt ? timeLeft(offer.expiresAt) : null;
  const checkoutLeft =
    offer.status === "accepted" && offer.checkoutExpiresAt && !offer.order
      ? timeLeft(offer.checkoutExpiresAt)
      : null;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-full max-w-[20rem] rounded-2xl border bg-white p-4 shadow-card dark:bg-zinc-900 sm:max-w-[22rem]",
          pending
            ? "border-brand-500/40 dark:border-brand-500/30"
            : "border-gray-200 dark:border-zinc-800"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <Tag className="h-3.5 w-3.5" />
            {title}
          </span>
          <OfferStatusBadge status={offer.status} />
        </div>

        {/* Product context (root proposals carry the snapshot) */}
        {!isCounter && (
          <div className="mt-3 flex items-center gap-2.5">
            <SmartImage
              src={offer.productImage}
              alt={offer.productName}
              wrapperClassName="h-10 w-10 shrink-0 rounded-lg"
                widths={WIDTHS.thumb}
                sizes="40px"
              className="h-full w-full rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {offer.productName}
              </p>
              <p className="text-xs text-gray-400">
                Asking {formatCents(offer.askingPriceCents, offer.currency)}
              </p>
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="mt-3">
          <OfferPrice cents={offer.amountCents} currency={offer.currency} size="lg" />
          <p className="mt-0.5 text-xs text-gray-400">
            {proposerName === "You" ? "Your proposal" : `Proposed by ${proposerName}`}
          </p>
        </div>

        {offer.message && (
          <p className="mt-2.5 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-zinc-800/60 dark:text-gray-300">
            “{offer.message}”
          </p>
        )}

        {/* Deadlines, straight from backend timestamps */}
        {(expiresIn || checkoutLeft) && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400">
            <Clock3 className="h-3.5 w-3.5" />
            {expiresIn
              ? `Expires in ${expiresIn}`
              : `Complete checkout within ${checkoutLeft}`}
          </p>
        )}

        <div className="mt-3">
          <OfferActions
            actions={actions}
            busyAction={busyAction}
            onAccept={onAccept}
            onCounter={onCounter}
            onDecline={onDecline}
            onCancel={onCancel}
          />
          {canCheckout && (
            <Button fullWidth onClick={onCheckout}>
              Complete checkout
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-500">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const OfferCard = memo(OfferCardComponent);
export default OfferCard;
