import { formatCents } from "../../lib/money";
import { cn } from "../../utils/cn";

const sizes = {
  sm: "text-sm font-semibold",
  md: "text-lg font-bold",
  lg: "text-3xl font-bold tracking-tight",
};

/** Formatted money display for negotiation amounts (integer cents in). */
export default function OfferPrice({ cents, currency = "EUR", size = "md", muted = false, className }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        sizes[size],
        muted
          ? "text-gray-500 dark:text-gray-400"
          : "text-gray-900 dark:text-white",
        className
      )}
    >
      {formatCents(cents, currency)}
    </span>
  );
}
