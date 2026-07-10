import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recent-searches";
const MAX = 6;

/**
 * Persisted list of recent search terms (most-recent first, de-duplicated).
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch {
      /* ignore */
    }
  }, [recent]);

  const add = useCallback((term) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((prev) =>
      [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX)
    );
  }, []);

  const remove = useCallback((term) => {
    setRecent((prev) => prev.filter((t) => t !== term));
  }, []);

  const clear = useCallback(() => setRecent([]), []);

  return { recent, add, remove, clear };
}
