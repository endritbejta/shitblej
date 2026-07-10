import { cn } from "../../utils/cn";

/**
 * Friendly empty / zero-result state. Optional icon, title, description and
 * a call-to-action slot (pass a <Button> as `action`).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-gray-200 px-6 py-16 text-center dark:border-zinc-800",
        className
      )}
    >
      {Icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
