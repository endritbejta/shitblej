import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DialogShell from "../ui/DialogShell";
import OfferComposer from "./OfferComposer";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import { useOfferOptions } from "../../hooks/useOfferOptions";
import { makeOffer } from "../../api/offers";

/**
 * "Make an offer" from a listing. The panel is driven by /offers/options; a
 * successful offer opens the negotiation with the seller in the inbox.
 * canOffer=false reasons from the envelope are rendered as guidance, not
 * re-derived client-side.
 */
export default function MakeOfferDialog({ product, sellerId, onClose }) {
  const navigate = useNavigate();
  const { options, loading, error, retry } = useOfferOptions(product._id, true);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(null);

  const submit = async (amountCents, message) => {
    setBusy(true);
    setServerError(null);
    try {
      await makeOffer({ product: product._id, type: "offer", amountCents, message });
      onClose();
      navigate(`/inbox?userId=${sellerId}`);
    } catch (err) {
      setServerError(
        err.response?.data?.error || "Couldn’t send your offer. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const blockedContent = (reason) => {
    if (reason === "active_offer_exists") {
      return (
        <div className="space-y-4 py-2">
          <Alert tone="info">
            You already have an active offer on this listing. Continue the
            negotiation in your messages.
          </Alert>
          <Button fullWidth onClick={() => navigate(`/inbox?userId=${sellerId}`)}>
            View negotiation
          </Button>
        </div>
      );
    }
    if (reason === "own_product") {
      return <Alert tone="info">This is your own listing.</Alert>;
    }
    return (
      <Alert tone="info">This product is no longer available for offers.</Alert>
    );
  };

  return (
    <DialogShell title="Make an offer" subtitle={product.name} busy={busy} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading offer options…
        </div>
      ) : error ? (
        <div className="space-y-4 py-4">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" fullWidth onClick={retry}>
            Retry
          </Button>
        </div>
      ) : options && !options.canOffer ? (
        blockedContent(options.reason)
      ) : options ? (
        <OfferComposer
          options={options}
          busy={busy}
          serverError={serverError}
          submitLabel="Send offer"
          onSubmit={submit}
          onCancel={onClose}
        />
      ) : null}
    </DialogShell>
  );
}
