import { cn } from "../../utils/cn";

/**
 * Pill badge. `neutral` is the default gray chip from the PDP;
 * `accent` is the green condition badge.
 */
const tones = {
  neutral: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300",
  accent:
    "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  solid: "bg-brand-500 text-white",
  glass:
    "bg-white/85 text-gray-900 border border-gray-200 backdrop-blur-sm dark:bg-zinc-900/80 dark:text-white dark:border-zinc-700",
};

export default function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
