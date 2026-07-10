import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "../../context/SearchContext";
import { cn } from "../../utils/cn";

/**
 * Header search entry point. `variant="bar"` is the primary, width-filling pill
 * (desktop); `variant="icon"` is the compact icon (mobile). Opening + keyboard
 * shortcuts are handled by the SearchProvider.
 */
export default function SearchTrigger({ variant = "bar", className }) {
  const { open } = useSearch();

  if (variant === "icon") {
    return (
      <button
        onClick={open}
        aria-label="Search"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:text-brand-600 dark:border-zinc-800 dark:text-gray-300 dark:hover:border-zinc-700",
          className
        )}
      >
        <SearchIcon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <button
      onClick={open}
      aria-label="Search"
      className={cn(
        "group flex h-11 items-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-2.5 text-sm text-gray-400 transition-colors duration-250 hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
        className
      )}
    >
      <SearchIcon className="h-4 w-4 shrink-0 transition-colors group-hover:text-gray-500 dark:group-hover:text-gray-300" />
      <span className="flex-1 text-left">Search products, brands and categories…</span>
      <kbd className="hidden shrink-0 items-center rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-400 dark:border-zinc-700 dark:bg-zinc-800 sm:flex">
        ⌘K
      </kbd>
    </button>
  );
}
