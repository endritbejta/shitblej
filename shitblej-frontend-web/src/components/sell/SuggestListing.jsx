import { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { suggestListing } from "../../api/products";
import { dataUrlToImage } from "../../utils/dataUrl";
import Button from "../ui/Button";
import Alert from "../ui/Alert";

/**
 * "Draft from photo" — asks the API to turn the cover photo into a draft
 * listing, then hands the result to the parent to apply.
 *
 * Two rules shape this component:
 *
 * It never overwrites the seller. Applying is the parent's job (see Sell.jsx),
 * and it only fills fields the seller has left empty. A suggestion that wipes
 * a title someone just typed is worse than no suggestion.
 *
 * It disappears rather than nags. When the API reports the feature is not
 * configured, the button hides for the rest of the session instead of offering
 * something that cannot work.
 */

const GENERIC_ERROR = "We couldn’t read that photo. Try another one.";

export default function SuggestListing({ previewDataUrl, hint, onApply, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) return null;

  const image = dataUrlToImage(previewDataUrl);

  const run = async () => {
    setError("");
    if (!image) {
      setError(GENERIC_ERROR);
      return;
    }

    try {
      setLoading(true);
      const suggestion = await suggestListing({ image, hint: hint?.trim() || undefined });
      setApplied(onApply(suggestion));
    } catch (err) {
      const status = err.response?.status;

      // The feature is off on this deployment. Say nothing further and stop
      // offering it.
      if (status === 503) {
        setUnavailable(true);
        return;
      }

      setError(err.response?.data?.error || GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={run}
          loading={loading}
          disabled={disabled || loading || !previewDataUrl}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Reading your photo…" : "Draft from photo"}
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {previewDataUrl
            ? "Fills the empty fields below. You can change anything."
            : "Add a photo first."}
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {applied && <AppliedSummary result={applied} />}
    </div>
  );
}

/**
 * What the suggestion actually did, in the seller's terms: which fields were
 * filled, what price it suggests, and anything it wants them to check.
 */
function AppliedSummary({ result }) {
  const { filled, skipped, price, warnings } = result;

  return (
    <div className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-gray-700 dark:text-gray-200">
        {filled.length > 0 ? (
          <>Filled {filled.join(", ")}.</>
        ) : (
          <>Everything was already filled in, so nothing was changed.</>
        )}
        {skipped.length > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            {" "}
            Left your {skipped.join(", ")} as you wrote {skipped.length > 1 ? "them" : "it"}.
          </span>
        )}
      </p>

      {price && (
        <p className="text-gray-600 dark:text-gray-300">
          Suggested price{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            €{price.suggested}
          </span>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            (€{price.low}–€{price.high})
          </span>
          {/* Say where the number comes from. It is a model's guess, not a
              read on comparable sales, and a seller pricing a real possession
              deserves to know which. */}
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            An estimate from the photo, not based on comparable sales.
          </span>
        </p>
      )}

      {warnings?.length > 0 && (
        <ul className="space-y-1.5">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
