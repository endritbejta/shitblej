import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
} from "react";

// The overlay is only loaded once the user first opens search.
const SearchOverlay = lazy(() => import("../components/search/SearchOverlay"));

const SearchContext = createContext(null);

/**
 * Owns the single search-overlay instance and exposes open/close so any
 * surface (header pill, hero, mobile nav) can trigger the same experience.
 * Registers the global ⌘/Ctrl-K and `/` shortcuts once.
 */
export function SearchProvider({ children }) {
  const [isOpen, setOpen] = useState(false);
  // Load + keep the overlay mounted after the first open so it can animate out.
  const [everOpened, setEverOpened] = useState(false);

  const open = useCallback(() => {
    setEverOpened(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const inField =
        /^(input|textarea|select)$/i.test(e.target.tagName) ||
        e.target.isContentEditable;
      if ((k === "k" && (e.metaKey || e.ctrlKey)) || (k === "/" && !inField)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {everOpened && (
        <Suspense fallback={null}>
          <SearchOverlay open={isOpen} onClose={close} />
        </Suspense>
      )}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
  return ctx;
}
