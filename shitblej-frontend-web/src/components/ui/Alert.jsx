import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../../utils/cn";

const tones = {
  error: {
    wrap: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-300",
    Icon: AlertCircle,
  },
  success: {
    wrap: "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/15 dark:text-brand-300",
    Icon: CheckCircle2,
  },
  info: {
    wrap: "border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300",
    Icon: Info,
  },
};

/** Compact, theme-aware inline alert with a leading icon. */
export default function Alert({ tone = "error", children, className }) {
  const { wrap, Icon } = tones[tone] || tones.info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm", wrap, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
