import { useEffect, useRef } from "react";

// Focus management for a modal surface.
//
// The dialogs already had `role="dialog"`, `aria-modal="true"`, Escape and a
// scroll lock - everything except focus. `aria-modal` tells a screen reader
// the rest of the page is inert, but it does not make it so: Tab still walked
// out of the dialog and into the page behind it, where the user was operating
// controls they could not see. And on open, focus stayed wherever it was, so a
// keyboard user had to Tab blindly to find the dialog they had just summoned.
//
// Three things, which are the accepted contract for a modal:
//   1. move focus into the dialog on open
//   2. keep Tab and Shift+Tab inside it
//   3. return focus to the trigger on close, so the page does not lose its place
//
// A library would be the right call for a whole dialog system (Radix, Base UI,
// React Aria). This is deliberately just the focus part, because the existing
// DialogShell already handles the rest and replacing it is a bigger change
// than the bug warrants.

// Tabbable, in document order. `:not([disabled])` and the negative-tabindex
// filter matter: a disabled button or a programmatically-focusable container
// is reachable by script but not by Tab, and trapping onto one strands the user.
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Visibility is checked with `checkVisibility()` where the browser has it,
// rather than `offsetParent !== null`. The offsetParent trick is the usual
// shorthand but it depends on layout, so it reports every element as hidden in
// any environment that does not lay out - which silently emptied this list
// under jsdom and would do the same in any headless renderer. Absent support,
// treat the element as visible and let the explicit attribute checks decide.
const isVisible = (el) => {
  if (typeof el.checkVisibility === "function") return el.checkVisibility();
  return !el.hidden && !el.closest("[hidden]");
};

const tabbable = (root) =>
  Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && !el.closest("[inert]") && isVisible(el)
  );

/**
 * Trap focus inside `ref` while `active`.
 *
 * Returns nothing; attach the ref to the dialog's outermost element.
 */
export function useFocusTrap(ref, active = true) {
  // Captured at the moment the dialog opens, so focus can go back to whatever
  // opened it rather than to the top of the document.
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Prefer the first real control. Falling back to the dialog itself keeps
    // the screen reader inside it even when there is nothing tabbable yet -
    // a dialog whose content is still loading, for instance. That fallback
    // needs the container to carry tabindex="-1", or focus() is a no-op on it
    // and focus stays wherever it was.
    const initial = tabbable(root)[0] || root;
    // `preventScroll` because focusing an element inside a freshly-mounted
    // portal can otherwise jump the page.
    initial.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const items = tabbable(root);
      if (items.length === 0) {
        // Nothing to move between; hold focus rather than letting it escape.
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      // Wrap at the edges. Also catches focus having drifted outside the
      // dialog entirely, which happens if the page moves focus while open.
      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !root.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);

      // Restore, but only if focus is still somewhere in the dialog being torn
      // down. If something else has deliberately taken focus - a second dialog,
      // a toast - stealing it back would be the bug.
      const restoreTo = previouslyFocused.current;
      if (restoreTo && document.body.contains(restoreTo)) {
        const active = document.activeElement;
        if (!active || active === document.body || root.contains(active)) {
          restoreTo.focus({ preventScroll: true });
        }
      }
    };
  }, [ref, active]);
}
