import { useState } from "react";
import DialogShell from "../ui/DialogShell";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import OfferPrice from "./OfferPrice";
import { checkoutOffer } from "../../api/orders";

const INITIAL_ADDRESS = {
  fullName: "",
  street: "",
  city: "",
  postalCode: "",
  country: "Kosovo",
  phone: "",
};

const FIELDS = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "phone", label: "Phone for delivery", type: "tel", autoComplete: "tel" },
  {
    name: "street",
    label: "Street address",
    autoComplete: "street-address",
    wide: true,
  },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { name: "country", label: "Country", autoComplete: "country-name" },
];

export default function CheckoutDialog({ offer, onClose, onSuccess }) {
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await checkoutOffer({
        offer: offer._id,
        shippingAddress: address,
        note: note.trim() || undefined,
      });
      onSuccess(order);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Couldn’t complete checkout. Please review the details and retry."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell
      title="Complete checkout"
      subtitle={offer.productName}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-zinc-800/60">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Agreed price
          </span>
          <OfferPrice
            cents={offer.amountCents}
            currency={offer.currency}
            size="sm"
          />
        </div>

        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Delivery details are stored with the order. Contact information is
          still blocked in chat to keep communication inside Shitblej.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map(({ name, label, type = "text", autoComplete, wide }) => (
            <label key={name} className={wide ? "sm:col-span-2" : undefined}>
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {label}
              </span>
              <input
                type={type}
                value={address[name]}
                onChange={(event) => updateField(name, event.target.value)}
                required
                autoComplete={autoComplete}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </label>
          ))}
        </div>

        <label>
          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Delivery note (optional)
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </label>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" loading={busy} className="flex-[2]">
            {busy ? "Creating order…" : "Complete checkout"}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
