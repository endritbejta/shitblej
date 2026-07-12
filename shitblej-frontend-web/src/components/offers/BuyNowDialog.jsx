import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake } from "lucide-react";
import DialogShell from "../ui/DialogShell";
import SmartImage from "../ui/SmartImage";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { makeOffer } from "../../api/offers";

/**
 * Buy Now = a full-price offer through the same negotiation pipeline: the
 * seller confirms before anything is sold. The dialog is explicit about that
 * so buyers don't mistake it for an instant purchase.
 */
export default function BuyNowDialog({ product, sellerId, onClose }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(null);

  const confirm = async () => {
    setBusy(true);
    setServerError(null);
    try {
      await makeOffer({ product: product._id, type: "buy_now" });
      onClose();
      navigate(`/inbox?userId=${sellerId}`);
    } catch (err) {
      setServerError(
        err.response?.data?.error || "Couldn’t send your request. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell title="Buy now" subtitle={product.name} busy={busy} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-zinc-800/60">
          <SmartImage
            src={product.images?.[0] || product.image}
            alt={product.name}
            wrapperClassName="h-16 w-16 shrink-0 rounded-lg"
            className="h-full w-full rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {product.name}
            </h3>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-500">
              €{product.price}
            </p>
          </div>
        </div>

        <p className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-gray-400">
          <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          This sends the seller a full-price request. Once they accept, the
          item is reserved for you to complete checkout.
        </p>

        {serverError && <Alert tone="error">{serverError}</Alert>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={busy} className="flex-1">
            Cancel
          </Button>
          <Button loading={busy} onClick={confirm} className="flex-[2]">
            {busy ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
