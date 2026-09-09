import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Tag,
  Layers,
  CornerDownLeft,
} from "lucide-react";
import { searchProducts } from "../../api/products";
import Spinner from "../ui/Spinner";
import { CATEGORIES, TRENDING_SEARCHES, FEATURED_COLLECTIONS } from "../../constants";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import SmartImage from "../ui/SmartImage";
import WishlistButton from "../ui/WishlistButton";
import { cn } from "../../utils/cn";
import { WIDTHS } from "../../lib/imageUrl";

const EXIT_MS = 200;

/**
 * Command-palette search. Opens as a full-width panel anchored below the top of
 * the viewport with a dimmed backdrop. Categorised results, full keyboard
 * navigation, global ESC, click-outside, and seamless enter/exit transitions
 * (transform/opacity only) with no layout shift.
 */
export default function SearchOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Mount/visibility lifecycle so the panel can animate out before unmounting.
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounced = useDebouncedValue(query, 250);
  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } =
    useRecentSearches();

  const hasQuery = debounced.trim().length >= 2;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      const raf = requestAnimationFrame(() => {
        setShow(true);
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Lock page scroll without a layout shift (compensate for the scrollbar).
  useEffect(() => {
    if (!open) return;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPad = style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = "hidden";
    if (sbw > 0) style.paddingRight = `${sbw}px`;
    return () => {
      style.overflow = prevOverflow;
      style.paddingRight = prevPad;
    };
  }, [open]);

  // Global Escape — closes regardless of what's focused.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!hasQuery) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchProducts(debounced)
      .then((data) => !cancelled && setResults(data.slice(0, 6)))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, hasQuery, open]);

  const submitTerm = useCallback(
    (term) => {
      const clean = term.trim();
      if (!clean) return;
      addRecent(clean);
      onClose();
      navigate(`/search?q=${encodeURIComponent(clean)}`);
    },
    [addRecent, navigate, onClose]
  );

  const goToProduct = useCallback(
    (product) => {
      addRecent(product.name);
      onClose();
      navigate(`/products/${product._id}`);
    },
    [addRecent, navigate, onClose]
  );

  const goToCategory = useCallback(
    (slug) => {
      onClose();
      navigate(`/collections/${slug}`);
    },
    [navigate, onClose]
  );

  const { sections, flat } = useMemo(() => {
    const flat = [];
    const push = (item) => {
      flat.push(item);
      return flat.length - 1;
    };
    const sections = [];

    if (hasQuery) {
      sections.push({
        id: "search-all",
        rows: [
          {
            index: push({ onSelect: () => submitTerm(debounced) }),
            kind: "search-all",
            data: debounced,
          },
        ],
      });

      const matchedCats = CATEGORIES.filter((c) =>
        c.label.toLowerCase().includes(debounced.toLowerCase())
      ).slice(0, 3);
      if (matchedCats.length) {
        sections.push({
          id: "categories",
          title: "Categories",
          rows: matchedCats.map((c) => ({
            index: push({ onSelect: () => goToCategory(c.id) }),
            kind: "category",
            data: c,
          })),
        });
      }

      sections.push({
        id: "products",
        title: "Products",
        rows: results.map((p) => ({
          index: push({ onSelect: () => goToProduct(p) }),
          kind: "product",
          data: p,
        })),
      });
    } else {
      if (recent.length) {
        sections.push({
          id: "recent",
          title: "Recent",
          action: { label: "Clear", onClick: clearRecent },
          rows: recent.map((term) => ({
            index: push({ onSelect: () => submitTerm(term) }),
            kind: "recent",
            data: term,
          })),
        });
      }
      sections.push({
        id: "trending",
        title: "Trending",
        rows: TRENDING_SEARCHES.map((term) => ({
          index: push({ onSelect: () => submitTerm(term) }),
          kind: "trending",
          data: term,
        })),
        layout: "wrap",
      });
      sections.push({
        id: "browse",
        title: "Browse categories",
        rows: CATEGORIES.map((c) => ({
          index: push({ onSelect: () => goToCategory(c.id) }),
          kind: "category",
          data: c,
        })),
      });
      sections.push({
        id: "collections",
        title: "Featured collections",
        rows: FEATURED_COLLECTIONS.map((col) => ({
          index: push({ onSelect: () => goToCategory(col.id) }),
          kind: "collection",
          data: col,
        })),
        layout: "grid",
      });
    }

    return { sections, flat };
  }, [hasQuery, debounced, results, recent, submitTerm, goToProduct, goToCategory, clearRecent]);

  useEffect(() => {
    setActiveIndex((i) => (flat.length ? Math.min(i, flat.length - 1) : 0));
  }, [flat.length]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) item.onSelect();
      else if (query.trim()) submitTerm(query);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!mounted) return null;

  const isActive = (i) => i === activeIndex;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search">
      {/* Backdrop */}
      <button
        aria-label="Close search"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-premium",
          show ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Panel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-3 sm:px-6">
        <div
          className={cn(
            "pointer-events-auto mt-3 w-full max-w-2xl overflow-hidden rounded-card-lg border border-gray-200 bg-white shadow-overlay transition-all duration-200 ease-premium dark:border-zinc-800 dark:bg-zinc-900 sm:mt-6",
            show ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.98] opacity-0"
          )}
        >
          {/* Input row */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-zinc-800">
            <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search products, categories, collections…"
              className="h-14 w-full bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus-visible:ring-0 dark:text-white"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear"
                className="grid h-7 w-7 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden shrink-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 dark:border-zinc-700 dark:bg-zinc-800 sm:block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain p-2">
            {loading && hasQuery && (
              <div className="flex animate-loader-in items-center gap-2 px-3 py-6 text-sm text-gray-400">
                <Spinner size="sm" />
                <span>Searching…</span>
              </div>
            )}

            {sections.map((section) => (
              <div key={section.id} className="mb-1">
                {section.title && (
                  <div className="flex items-center justify-between px-3 pb-1 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      {section.title}
                    </span>
                    {section.action && (
                      <button
                        onClick={section.action.onClick}
                        className="text-[11px] font-medium text-gray-400 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {section.action.label}
                      </button>
                    )}
                  </div>
                )}

                {section.layout === "wrap" ? (
                  <div className="flex flex-wrap gap-2 px-3 py-1.5">
                    {section.rows.map((row) => (
                      <button
                        key={row.index}
                        data-index={row.index}
                        onMouseEnter={() => setActiveIndex(row.index)}
                        onClick={() => flat[row.index].onSelect()}
                        className={cn("chip transition-colors", isActive(row.index) && "!bg-brand-600 !text-white")}
                      >
                        <TrendingUp className="h-3 w-3" />
                        {row.data}
                      </button>
                    ))}
                  </div>
                ) : section.layout === "grid" ? (
                  <div className="grid grid-cols-2 gap-2 px-2 py-1.5">
                    {section.rows.map((row) => (
                      <button
                        key={row.index}
                        data-index={row.index}
                        onMouseEnter={() => setActiveIndex(row.index)}
                        onClick={() => flat[row.index].onSelect()}
                        className={cn(
                          "group relative flex h-20 items-end overflow-hidden rounded-xl border border-gray-200 text-left transition-shadow dark:border-zinc-800",
                          isActive(row.index) && "ring-2 ring-brand-500"
                        )}
                      >
                        <SmartImage
                          src={row.data.image}
                          alt={row.data.title}
                          wrapperClassName="absolute inset-0 h-full w-full"
                widths={WIDTHS.tile}
                sizes="(min-width: 640px) 25vw, 50vw"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="relative p-2.5">
                          <p className="text-sm font-semibold text-white">{row.data.title}</p>
                          <p className="text-[11px] text-white/70">{row.data.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ul>
                    {section.rows.map((row) => (
                      <li key={row.index}>
                        <SearchRow
                          row={row}
                          active={isActive(row.index)}
                          onHover={() => setActiveIndex(row.index)}
                          onSelect={() => flat[row.index].onSelect()}
                          onRemove={row.kind === "recent" ? () => removeRecent(row.data) : undefined}
                        />
                      </li>
                    ))}
                    {section.id === "products" && !loading && !results.length && (
                      <li className="px-3 py-6 text-center text-sm text-gray-400">
                        No products match “{debounced}”.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="hidden items-center gap-4 border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-400 dark:border-zinc-800 sm:flex">
            <span className="flex items-center gap-1.5">
              <CornerDownLeft className="h-3 w-3" /> to select
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono">↑↓</span> to navigate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono">esc</span> to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** A single list row (search-all action, category, recent term or product). */
function SearchRow({ row, active, onHover, onSelect, onRemove }) {
  const base = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
    active ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
  );

  if (row.kind === "search-all") {
    return (
      <button data-index={row.index} onMouseEnter={onHover} onClick={onSelect} className={base}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm text-gray-900 dark:text-white">
          Search for <span className="font-semibold">“{row.data}”</span>
        </span>
        <ArrowUpRight className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  if (row.kind === "category") {
    const Icon = row.data.icon;
    return (
      <button data-index={row.index} onMouseEnter={onHover} onClick={onSelect} className={base}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
          {Icon ? <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Tag className="h-4 w-4 text-gray-400" />}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{row.data.label}</span>
        <Layers className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
      </button>
    );
  }

  if (row.kind === "recent") {
    return (
      <div data-index={row.index} onMouseEnter={onHover} className={cn(base, "group")}>
        <button onClick={onSelect} className="flex flex-1 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-800">
            <Clock className="h-4 w-4" />
          </span>
          <span className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200">{row.data}</span>
        </button>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove"
            className="grid h-6 w-6 place-items-center rounded-full text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // product — a container (not a nested button) so the heart can be its own control
  const p = row.data;
  return (
    <div data-index={row.index} onMouseEnter={onHover} className={cn(base, "group")}>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <SmartImage
          src={p.images?.[0] || p.image}
          alt={p.name}
          wrapperClassName="h-11 w-11 shrink-0 rounded-lg"
                widths={WIDTHS.thumb}
                sizes="44px"
          className="h-full w-full rounded-lg object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
          <span className="flex items-center gap-2 text-xs text-gray-400">
            {p.condition && <span className="truncate">{p.condition}</span>}
            {p.condition && p.category && <span>·</span>}
            {p.category && <span className="truncate">{p.category}</span>}
          </span>
        </span>
      </button>
      <span className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-500">${p.price}</span>
      <WishlistButton
        product={p}
        variant="surface"
        size="sm"
        className="opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}
