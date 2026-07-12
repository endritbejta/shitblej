// One money formatter for the negotiation domain. The backend deals in
// integer cents + an ISO currency code; everything user-facing goes through
// here so formatting stays consistent (and locale-correct) app-wide.

const formatters = new Map();

function formatterFor(currency, withDecimals) {
  const key = `${currency}:${withDecimals}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        minimumFractionDigits: withDecimals ? 2 : 0,
        maximumFractionDigits: withDecimals ? 2 : 0,
      })
    );
  }
  return formatters.get(key);
}

/** 9500, "EUR" -> "€95" · 9550, "EUR" -> "€95.50" */
export function formatCents(cents, currency = "EUR") {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "";
  const euros = cents / 100;
  return formatterFor(currency, cents % 100 !== 0).format(euros);
}

/** "95.5" -> 9550; returns null when unparseable. */
export function parseAmountToCents(input) {
  const value = parseFloat(String(input).replace(",", "."));
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

/** Cents -> plain number of major units for <input type="number"> values. */
export function centsToUnit(cents) {
  return Math.round(cents) / 100;
}
