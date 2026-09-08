// Scroll helpers for feeds that pin to their newest item.

// How close to the bottom still counts as "following along".
const NEAR_BOTTOM_PX = 120;

/**
 * Is this scroll container close enough to its bottom that the reader is
 * following new content rather than reading back through history?
 *
 * The distinction matters for a chat: auto-scrolling someone who has
 * deliberately scrolled up to re-read something yanks the message they were
 * looking at off the screen.
 */
export function isNearBottom(el, threshold = NEAR_BOTTOM_PX) {
  if (!el) return false;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/**
 * Put a scroll container at its bottom.
 *
 * Deliberately mutates the container's own `scrollTop` rather than calling
 * `scrollIntoView()` on a child. `scrollIntoView` scrolls EVERY scrollable
 * ancestor, the document included, so using it to pin a chat to its newest
 * message also drags the whole page down - which is the bug this replaced.
 * Touching `scrollTop` cannot move anything but this element.
 *
 * `smooth` is for content arriving while the reader watches. Opening a thread
 * uses the instant path: you should already be at the newest message, not
 * travel there past everything that came before.
 */
export function scrollToBottom(el, { smooth = false } = {}) {
  if (!el) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // CSS `scroll-behavior: auto !important` (which index.css sets under the
  // preference) does not constrain a JS-requested smooth scroll, so the
  // preference has to be honoured here too.
  if (smooth && !prefersReducedMotion) {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    return;
  }

  el.scrollTop = el.scrollHeight;
}
