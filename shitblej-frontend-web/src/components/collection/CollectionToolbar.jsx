import { useState } from "react";
import { SlidersHorizontal, ArrowDownUp, Check } from "lucide-react";
import Popover, { PopoverOption } from "../ui/Popover";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import { PRICE_RANGES } from "../../constants";
import { SORTS } from "../../hooks/useProductFilters";
import { cn } from "../../utils/cn";

/**
 * Sticky filter/sort controls. Desktop shows inline popover pills; mobile
 * collapses everything into Sort + Filters buttons backed by a bottom sheet.
 */
export default function CollectionToolbar({
  resultCount,
  filters,
  availableConditions,
  activeCount,
  setSort,
  toggleCondition,
  setPrice,
  clear,
}) {
  const [sheet, setSheet] = useState(null); // 'filters' | 'sort' | null
  const currentSort = SORTS.find((s) => s.id === filters.sort);

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-gray-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-black/70 md:top-[104px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{resultCount}</span>{" "}
          {resultCount === 1 ? "item" : "items"}
        </p>

        {/* Desktop controls */}
        <div className="hidden items-center gap-2 md:flex">
          <Popover
            label="Condition"
            icon={SlidersHorizontal}
            active={filters.conditions.length > 0}
            badge={filters.conditions.length || undefined}
          >
            <div className="max-h-72 overflow-y-auto">
              {availableConditions.length ? (
                availableConditions.map((c) => (
                  <PopoverOption
                    key={c}
                    selected={filters.conditions.includes(c)}
                    onClick={() => toggleCondition(c)}
                  >
                    {c}
                  </PopoverOption>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400">No conditions</p>
              )}
            </div>
          </Popover>

          <Popover label="Price" active={!!filters.price} badge={filters.price ? 1 : undefined}>
            {PRICE_RANGES.map((r) => (
              <PopoverOption key={r.id} selected={filters.price?.id === r.id} onClick={() => setPrice(r)}>
                {r.label}
              </PopoverOption>
            ))}
          </Popover>

          {activeCount > 0 && (
            <button
              onClick={clear}
              className="px-2 text-sm font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
            >
              Clear all
            </button>
          )}

          <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-zinc-800" />

          <Popover label={currentSort?.label ?? "Sort"} icon={ArrowDownUp} align="right">
            {({ close }) =>
              SORTS.map((s) => (
                <PopoverOption
                  key={s.id}
                  selected={filters.sort === s.id}
                  onClick={() => {
                    setSort(s.id);
                    close();
                  }}
                >
                  {s.label}
                </PopoverOption>
              ))
            }
          </Popover>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setSheet("sort")}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-sm font-medium text-gray-700 dark:border-zinc-800 dark:text-gray-200"
          >
            <ArrowDownUp className="h-4 w-4" /> Sort
          </button>
          <button
            onClick={() => setSheet("filters")}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
              activeCount
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "border-gray-200 text-gray-700 dark:border-zinc-800 dark:text-gray-200"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {activeCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: Sort sheet */}
      <BottomSheet open={sheet === "sort"} onClose={() => setSheet(null)} title="Sort by">
        <div className="space-y-1 pb-2">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSort(s.id);
                setSheet(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-zinc-800/60"
            >
              {s.label}
              {filters.sort === s.id && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Mobile: Filters sheet */}
      <BottomSheet
        open={sheet === "filters"}
        onClose={() => setSheet(null)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={clear}>
              Clear
            </Button>
            <Button fullWidth onClick={() => setSheet(null)}>
              Show {resultCount} items
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pb-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Condition</h4>
            <div className="flex flex-wrap gap-2">
              {availableConditions.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm",
                    filters.conditions.includes(c)
                      ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 dark:border-zinc-800 dark:text-gray-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Price</h4>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPrice(r)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm",
                    filters.price?.id === r.id
                      ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 dark:border-zinc-800 dark:text-gray-300"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
