import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Lightweight click-to-open popover used for filter/sort menus.
 * Closes on outside click, Escape, or when `closeOnSelect` children call onClose.
 */
export default function Popover({ label, icon: Icon, active = false, badge, align = "left", children, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
          active || open
            ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
            : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-zinc-800 dark:text-gray-200 dark:hover:border-zinc-700"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
        {badge ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : (
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-40 mt-2 min-w-[220px] origin-top animate-scale-in rounded-2xl border border-gray-200 bg-white p-2 shadow-overlay dark:border-zinc-800 dark:bg-zinc-900",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

/** A selectable row inside a Popover. */
export function PopoverOption({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-gray-100 font-medium text-gray-900 dark:bg-zinc-800 dark:text-white"
          : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800/60"
      )}
    >
      {children}
      {selected && <span className="h-2 w-2 rounded-full bg-brand-500" />}
    </button>
  );
}
