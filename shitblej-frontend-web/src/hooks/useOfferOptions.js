import { useCallback, useEffect, useState } from "react";
import { getOfferOptions } from "../api/offers";

/**
 * Fetch the negotiation envelope for a product: asking price, [min,max]
 * bounds, suggested amounts, canOffer + reason. The offer UI renders ONLY
 * what this returns — no client-side pricing rules.
 *
 * `enabled` lets callers defer the fetch until the panel is actually opened.
 */
export function useOfferOptions(productId, enabled = true) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOfferOptions(productId)
      .then((data) => !cancelled && setOptions(data))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.error || "Couldn’t load offer options. Please retry."
        );
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [productId, enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { options, loading, error, retry };
}
