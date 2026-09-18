/**
 * Splits a FileReader data URL into the shape the suggestion API expects.
 *
 * The Sell form already reads each chosen file with `readAsDataURL` to render a
 * preview, so the base64 is in hand — there is no need to read the file twice.
 *
 * Returns null for anything that is not a base64 data URL, which callers should
 * treat as "this photo cannot be sent" rather than crashing on it.
 */
export function dataUrlToImage(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl ?? "");
  if (!match) return null;
  return { kind: "base64", mediaType: match[1], data: match[2] };
}
