import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Consistent section heading used by every homepage/collection rail:
 * optional eyebrow, title, subtitle, and an optional "see all" action.
 */
export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  actionTo,
  className,
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-[28px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400 sm:inline-flex"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-250 ease-premium group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
