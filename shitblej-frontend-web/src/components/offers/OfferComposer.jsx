import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { formatCents, parseAmountToCents, centsToUnit } from "../../lib/money";
import { cn } from "../../utils/cn";

const SLIDER_STEP_CENTS = 100;

/**
 * The offer panel: slider + quick-pick chips + numeric input + live preview.
 * Every number here (asking price, bounds, suggestions, currency) comes from
 * the /offers/options envelope — no client-side pricing rules.
 */
export default function OfferComposer({
  options,
  initialCents,
  busy = false,
  serverError = null,
  submitLabel = "Send offer",
  onSubmit,
  onCancel,
}) {
  const { askingPriceCents, minCents, maxCents, suggestedCents = [], currency } = options;

  const defaultCents =
    initialCents != null
      ? Math.min(Math.max(initialCents, minCents), maxCents)
      : suggestedCents[Math.floor(suggestedCents.length / 2)] ?? maxCents;

  const [cents, setCents] = useState(defaultCents);
  // Free-typed text mirrors `cents` but may be transiently invalid.
  const [inputValue, setInputValue] = useState(String(centsToUnit(defaultCents)));
  const [note, setNote] = useState("");

  const outOfBounds = cents == null || cents < minCents || cents > maxCents;

  // Display-only context: how far below asking the current amount sits.
  const belowAskingPct = useMemo(() => {
    if (cents == null || !askingPriceCents) return null;
    const pct = Math.round((1 - cents / askingPriceCents) * 100);
    return pct > 0 ? pct : null;
  }, [cents, askingPriceCents]);

  const setAmount = (nextCents) => {
    setCents(nextCents);
    setInputValue(String(centsToUnit(nextCents)));
  };

  const onInputChange = (raw) => {
    setInputValue(raw);
    setCents(parseAmountToCents(raw));
  };

  const submit = (e) => {
    e.preventDefault();
    if (outOfBounds || busy) return;
    onSubmit(cents, note.trim() || undefined);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Context */}
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Asking price</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCents(askingPriceCents, currency)}
        </span>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl bg-gray-50 py-5 text-center dark:bg-zinc-800/60">
        <p
          className={cn(
            "text-4xl font-bold tabular-nums tracking-tight",
            outOfBounds ? "text-red-500" : "text-gray-900 dark:text-white"
          )}
          aria-live="polite"
        >
          {cents != null ? formatCents(cents, currency) : "—"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {belowAskingPct
            ? `${belowAskingPct}% below asking`
            : cents === askingPriceCents
              ? "Full asking price"
              : " "}
        </p>
      </div>

      {/* Slider */}
      <div>
        <input
          type="range"
          min={minCents}
          max={maxCents}
          step={SLIDER_STEP_CENTS}
          value={cents != null ? Math.min(Math.max(cents, minCents), maxCents) : minCents}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={busy}
          aria-label="Offer amount"
          aria-valuetext={cents != null ? formatCents(cents, currency) : undefined}
          className="w-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{formatCents(minCents, currency)}</span>
          <span>{formatCents(maxCents, currency)}</span>
        </div>
      </div>

      {/* Quick picks */}
      {suggestedCents.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested offers">
          {suggestedCents.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => setAmount(s)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                cents === s
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-zinc-700 dark:text-gray-300 dark:hover:border-zinc-600"
              )}
            >
              {formatCents(s, currency)}
            </button>
          ))}
        </div>
      )}

      {/* Exact amount + note */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            €
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={busy}
            aria-label="Exact offer amount"
            aria-invalid={outOfBounds || undefined}
            className={cn(
              "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-sm text-gray-900 dark:bg-zinc-900 dark:text-white",
              outOfBounds ? "border-red-400 dark:border-red-500/60" : "border-gray-200 dark:border-zinc-800"
            )}
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          disabled={busy}
          placeholder="Add a note (optional)"
          aria-label="Offer note"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      {outOfBounds && cents != null && (
        <p role="alert" className="text-xs font-medium text-red-500">
          Offers must be between {formatCents(minCents, currency)} and {formatCents(maxCents, currency)}.
        </p>
      )}
      {serverError && <Alert tone="error">{serverError}</Alert>}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy} disabled={outOfBounds} className="flex-[2]">
          {busy ? "Sending…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
