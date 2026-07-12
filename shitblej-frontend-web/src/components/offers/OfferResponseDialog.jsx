import { Loader2 } from "lucide-react";
import DialogShell from "../ui/DialogShell";
import OfferComposer from "./OfferComposer";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import { useOfferOptions } from "../../hooks/useOfferOptions";

const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

/**
 * Modal hosting the offer panel for a counter-offer, initialized with the
 * proposal being countered. Bounds/suggestions come fresh from
 * /offers/options for the offer's product.
 */
export default function OfferResponseDialog({ offer, busy, serverError, onSubmit, onClose }) {
  const { options, loading, error, retry } = useOfferOptions(idOf(offer.product), true);

  return (
    <DialogShell title="Counter offer" subtitle={offer.productName} busy={busy} onClose={onClose}>
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
      ) : options ? (
        <OfferComposer
          options={options}
          initialCents={offer.amountCents}
          busy={busy}
          serverError={serverError}
          submitLabel="Send counter"
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      ) : null}
    </DialogShell>
  );
}
