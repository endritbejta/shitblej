import { Clock3, CheckCircle2, XCircle, Reply, Undo2, TimerOff } from "lucide-react";
import { OFFER_STATUS_META } from "../../lib/negotiation";
import { cn } from "../../utils/cn";

const TONES = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  success:
    "bg-brand-500/10 text-brand-700 dark:text-brand-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  muted: "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400",
};

const ICONS = {
  pending: Clock3,
  accepted: CheckCircle2,
  declined: XCircle,
  countered: Reply,
  cancelled: Undo2,
  expired: TimerOff,
};

/** Status chip for an offer, driven by the backend status string. */
export default function OfferStatusBadge({ status, className }) {
  const meta = OFFER_STATUS_META[status];
  if (!meta) return null;
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[meta.tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}
