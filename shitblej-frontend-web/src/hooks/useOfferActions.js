import { useCallback, useState } from "react";
import {
  acceptOffer,
  declineOffer,
  counterOffer,
  cancelOffer,
} from "../api/offers";

const RUNNERS = {
  accept: (id) => acceptOffer(id),
  decline: (id) => declineOffer(id),
  cancel: (id) => cancelOffer(id),
  counter: (id, payload) => counterOffer(id, payload),
};

/**
 * Respond to offers with per-offer busy + error state. Duplicate requests are
 * blocked while one is in flight; the backend's atomic guards are the real
 * protection. `onSettled` fires after every successful action so the caller
 * can resync the thread (accepted elsewhere, superseded rivals, etc.).
 */
export function useOfferActions({ onSettled } = {}) {
  // { [offerId]: "accept" | "decline" | "counter" | "cancel" }
  const [busy, setBusy] = useState({});
  // { [offerId]: message }
  const [errors, setErrors] = useState({});

  const run = useCallback(
    async (action, offerId, payload) => {
      if (busy[offerId]) return null;
      setBusy((b) => ({ ...b, [offerId]: action }));
      setErrors((e) => ({ ...e, [offerId]: undefined }));
      try {
        const offer = await RUNNERS[action](offerId, payload);
        onSettled?.(offer, action);
        return offer;
      } catch (err) {
        const message =
          err.response?.data?.error ||
          "Something went wrong. Refresh and try again.";
        setErrors((e) => ({ ...e, [offerId]: message }));
        // State may have changed underneath us (409s) — let the caller resync.
        if (err.response?.status === 409) onSettled?.(null, action);
        throw err;
      } finally {
        setBusy((b) => {
          const next = { ...b };
          delete next[offerId];
          return next;
        });
      }
    },
    [busy, onSettled]
  );

  return {
    busyFor: (offerId) => busy[offerId] || null,
    errorFor: (offerId) => errors[offerId] || null,
    accept: (offerId) => run("accept", offerId),
    decline: (offerId) => run("decline", offerId),
    cancel: (offerId) => run("cancel", offerId),
    counter: (offerId, payload) => run("counter", offerId, payload),
  };
}
