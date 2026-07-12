import { CheckCircle2, XCircle, Undo2, TimerOff, Tag } from "lucide-react";
import { cn } from "../../utils/cn";

const STATUS_STYLE = {
  accepted: { Icon: CheckCircle2, tone: "text-brand-600 dark:text-brand-400 bg-brand-500/10" },
  declined: { Icon: XCircle, tone: "text-red-600 dark:text-red-400 bg-red-500/10" },
  cancelled: { Icon: Undo2, tone: "text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-zinc-800" },
  expired: { Icon: TimerOff, tone: "text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-zinc-800" },
};

/**
 * Compact, centered system event for a negotiation lifecycle step. The copy
 * is the backend-provided fallback line for that step — never fabricated.
 */
export default function OfferSystemEvent({ text, offer }) {
  const { Icon, tone } = STATUS_STYLE[offer?.status] || {
    Icon: Tag,
    tone: "text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-zinc-800",
  };

  return (
    <div className="flex justify-center">
      <span
        className={cn(
          "inline-flex max-w-[85%] items-center gap-1.5 rounded-full px-3 py-1.5 text-center text-xs font-medium",
          tone
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{text}</span>
      </span>
    </div>
  );
}
